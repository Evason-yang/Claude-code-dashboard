import { readdirSync, statSync, existsSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { createHash } from 'crypto'
import os from 'os'
import { getClaudeProjectDir, encodePath } from './sessions.js'

const CLAUDE_PROJECTS_DIR = join(os.homedir(), '.claude', 'projects')

function makeId(path) {
  return createHash('md5').update(path).digest('hex').slice(0, 8)
}

function getLastActive(projectPath) {
  const dir = getClaudeProjectDir(projectPath)
  if (!existsSync(dir)) return null
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'))
    let latest = null
    for (const f of files) {
      const lines = readFileSync(join(dir, f), 'utf8').trim().split('\n')
      for (const line of [...lines].reverse()) {
        try {
          const obj = JSON.parse(line)
          if (obj.timestamp) {
            const t = new Date(obj.timestamp)
            if (!latest || t > latest) latest = t
            break
          }
        } catch { /* skip */ }
      }
    }
    return latest ? latest.toISOString() : null
  } catch {
    return null
  }
}

// 从 ~/.claude/projects/<encoded> 还原真实路径
// 编码规则：/ → -（包括开头的 /）
// 还原：用动态规划贪心匹配文件系统，逐段验证路径存在
function decodeProjectPath(encoded) {
  // encoded 形如 -Users-username--tmux（所有非字母数字字符都被替换为 -）
  // 还原：贪心匹配文件系统，逐段验证路径存在（处理含 - 或 . 的目录名）
  // 去掉开头的 -（代表根 /），剩余按 - 分割
  const tokens = encoded.replace(/^-+/, '').split('-')

  function resolve(idx, current) {
    if (idx === tokens.length) return existsSync(current) ? current : null
    // 尝试把从 idx 开始的连续若干 token 合并为一个路径段
    // 路径段中的分隔符可能是 - 或 . 等，需要枚举所有可能的合并方式
    function trySegment(tokenIdx, prefix) {
      if (tokenIdx >= tokens.length) return null
      // 当前 token 追加到 prefix（用 - 连接，因为原始字符可能是 - 或其他）
      const withDash = prefix ? prefix + '-' + tokens[tokenIdx] : tokens[tokenIdx]
      // 也尝试用 . 连接（处理 .tmux → -tmux 这种以 . 开头的目录）
      const withDot = prefix ? prefix + '.' + tokens[tokenIdx] : '.' + tokens[tokenIdx]

      const candidates = prefix === ''
        ? [tokens[tokenIdx], '.' + tokens[tokenIdx]]  // 首个 token：尝试普通和点开头
        : [withDash, withDot]

      for (const seg of candidates) {
        const candidate = join(current, seg)
        const result = resolve(tokenIdx + 1, candidate)
        if (result) return result
      }
      return null
    }

    // 简化：直接枚举从 idx 开始的连续 token 合并
    let segment = ''
    for (let end = idx; end < tokens.length; end++) {
      // 尝试普通合并（- 连接）
      segment = segment ? segment + '-' + tokens[end] : tokens[end]
      const r1 = resolve(end + 1, join(current, segment))
      if (r1) return r1

      // 尝试以 . 开头的目录名（如 .tmux、.config）
      if (end === idx) {
        const dotSeg = '.' + tokens[end]
        const r2 = resolve(end + 1, join(current, dotSeg))
        if (r2) return r2
      }
    }
    return null
  }

  // 尝试 Unix 根路径
  const resolvedUnix = resolve(0, '/')
  if (resolvedUnix) return resolvedUnix

  // 尝试 Windows 驱动器
  if (process.platform === 'win32' && tokens.length > 0 && /^[A-Za-z]$/.test(tokens[0])) {
    const drive = tokens[0].toUpperCase() + ':\\'
    const resolvedWin = resolve(1, drive)
    if (resolvedWin) return resolvedWin
    return drive + tokens.slice(1).join('\\')
  }

  // fallback
  return '/' + tokens.join('/')
}

// 扫描 ~/.claude/projects/ 得到所有有会话记录的项目
function getAllKnownProjects() {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) return []
  try {
    return readdirSync(CLAUDE_PROJECTS_DIR)
      .filter(name => {
        try {
          const full = join(CLAUDE_PROJECTS_DIR, name)
          return statSync(full).isDirectory() &&
            readdirSync(full).some(f => f.endsWith('.jsonl'))
        } catch { return false }
      })
      .map(encoded => {
        const path = decodeProjectPath(encoded)
        return {
          id: makeId(path),
          name: basename(path) || path,
          path,
          lastActive: getLastActive(path),
          source: 'auto'
        }
      })
  } catch {
    return []
  }
}

export function buildProjectList(config) {
  const seen = new Set()
  const all = []

  // 1. 从 ~/.claude/projects/ 自动发现所有项目（最准确）
  for (const p of getAllKnownProjects()) {
    if (!seen.has(p.path)) { seen.add(p.path); all.push(p) }
  }

  // 2. 手动添加的项目（可能不在 ~/.claude/projects/ 里，或路径解码有偏差）
  for (const path of (config.manualProjects || [])) {
    if (!seen.has(path)) {
      seen.add(path)
      all.push({
        id: makeId(path),
        name: basename(path) || path,
        path,
        lastActive: getLastActive(path),
        source: 'manual'
      })
    }
  }

  // 3. 过滤隐藏项目
  const hidden = new Set(config.hiddenProjects || [])
  const visible = all.filter(p => !hidden.has(p.path))

  // 4. 应用手动排序（projectOrder 是 path 数组）
  const order = config.projectOrder || []
  if (order.length > 0) {
    const orderMap = new Map(order.map((path, i) => [path, i]))
    return visible.sort((a, b) => {
      const ia = orderMap.has(a.path) ? orderMap.get(a.path) : Infinity
      const ib = orderMap.has(b.path) ? orderMap.get(b.path) : Infinity
      if (ia !== ib) return ia - ib
      // 未排序的按最近活动时间
      if (!a.lastActive) return 1
      if (!b.lastActive) return -1
      return new Date(b.lastActive) - new Date(a.lastActive)
    })
  }

  return visible.sort((a, b) => {
    if (!a.lastActive) return 1
    if (!b.lastActive) return -1
    return new Date(b.lastActive) - new Date(a.lastActive)
  })
}

export function getProjectById(list, id) {
  return list.find(p => p.id === id) || null
}
