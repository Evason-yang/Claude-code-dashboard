import { readdirSync, statSync, existsSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { createHash } from 'crypto'
import os from 'os'
import { getClaudeProjectDir, encodePath } from './sessions.js'
import { loadConfig, saveConfig } from './config.js'

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

// 内存缓存（进程级，避免重复 I/O）
const decodeCache = new Map()

// 跳过这些目录
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '__pycache__', '.cache',
  'build', 'dist', 'target', 'out', '.idea', '.vscode',
  'Library', 'Applications', 'System', 'Volumes', 'private', 'etc', 'tmp',
])

// 把解码结果写入 config.pathMap，与 Claude Code 解耦、持久化
function savePathMap(encoded, realPath) {
  try {
    const cfg = loadConfig()
    if (!cfg.pathMap) cfg.pathMap = {}
    if (cfg.pathMap[encoded] !== realPath) {
      cfg.pathMap[encoded] = realPath
      saveConfig(cfg)
    }
  } catch {}
}

// 从 ~/.claude/projects/<encoded> 还原真实路径
// 优先级：1) 内存缓存  2) config.pathMap  3) 文件系统搜索  4) 字符串猜测
function decodeProjectPath(encoded) {
  if (decodeCache.has(encoded)) return decodeCache.get(encoded)

  // 优先查我们自己维护的 pathMap
  try {
    const cfg = loadConfig()
    const mapped = (cfg.pathMap || {})[encoded]
    if (mapped) {
      decodeCache.set(encoded, mapped)
      return mapped
    }
  } catch {}

  const home = os.homedir()
  const targetDepth = Math.min((encoded.match(/[a-zA-Z0-9]+/g) || []).length, 8)

  function search(dir, depth) {
    if (depth === 0) return null
    let entries
    try { entries = readdirSync(dir) } catch { return null }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue
      const full = join(dir, entry)
      let isDir = false
      try { isDir = statSync(full).isDirectory() } catch { continue }
      if (!isDir) continue
      if (encodePath(full) === encoded) return full
      const currentEncoded = encodePath(full)
      if (encoded.startsWith(currentEncoded) && depth > 1) {
        const found = search(full, depth - 1)
        if (found) return found
      }
    }
    return null
  }

  const roots = new Set([home])
  let cur = home
  for (let i = 0; i < 3; i++) {
    const parent = join(cur, '..')
    if (parent === cur) break
    roots.add(parent)
    cur = parent
  }
  if (process.platform === 'win32') {
    ;['C:\\Users', 'D:\\Users', 'C:\\', 'D:\\'].forEach(r => roots.add(r))
  }

  for (const root of roots) {
    if (!existsSync(root)) continue
    const found = search(root, targetDepth)
    if (found) {
      decodeCache.set(encoded, found)
      savePathMap(encoded, found)   // 持久化，下次直接命中
      return found
    }
  }

  // fallback：字符串猜测
  const tokens = encoded.replace(/^-+/, '').split('-').filter(Boolean)
  let fallback
  if (process.platform === 'win32') {
    // Windows 编码保留冒号，第一个 token 形如 "C:"
    if (/^[A-Za-z]:$/.test(tokens[0])) {
      fallback = tokens[0].toUpperCase() + '\\' + tokens.slice(1).join('\\')
    } else {
      fallback = tokens.join('\\')
    }
  } else {
    fallback = '/' + tokens.join('/')
  }
  decodeCache.set(encoded, fallback)
  return fallback
}

// 手动添加项目时，直接把 encoded→realPath 写入 pathMap
export function registerPathMapping(realPath) {
  const encoded = encodePath(realPath)
  decodeCache.set(encoded, realPath)
  savePathMap(encoded, realPath)
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
