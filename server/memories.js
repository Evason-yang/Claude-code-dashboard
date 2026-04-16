import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import os from 'os'
import { encodePath } from './sessions.js'

const HOME = process.env.HOME || os.homedir()
const GLOBAL_MEMORY_DIR = join(HOME, '.claude', 'memory')
const GLOBAL_CLAUDE_MD = join(HOME, '.claude', 'CLAUDE.md')

const SYNC_BEGIN = '<!-- claude-dashboard:global-memories:begin -->'
const SYNC_END = '<!-- claude-dashboard:global-memories:end -->'

function syncGlobalMemoriesToClaudeMd() {
  const memories = listGlobalMemories()

  // 构建同步区块内容
  let block = ''
  if (memories.length > 0) {
    const sections = memories.map(m => {
      const lines = [`## ${m.name}`]
      if (m.description) lines.push(`> ${m.description}`)
      if (m.content) lines.push('', m.content)
      return lines.join('\n')
    })
    block = `${SYNC_BEGIN}\n# Global Memories\n\n${sections.join('\n\n---\n\n')}\n\n${SYNC_END}`
  } else {
    block = `${SYNC_BEGIN}\n${SYNC_END}`
  }

  // 读取现有 CLAUDE.md，替换或追加区块
  let existing = ''
  if (existsSync(GLOBAL_CLAUDE_MD)) {
    existing = readFileSync(GLOBAL_CLAUDE_MD, 'utf8')
  }

  if (existing.includes(SYNC_BEGIN)) {
    // 替换已有区块
    const updated = existing.replace(
      new RegExp(`${SYNC_BEGIN}[\\s\\S]*?${SYNC_END}`),
      block
    )
    writeFileSync(GLOBAL_CLAUDE_MD, updated)
  } else {
    // 追加到末尾（空行分隔）
    const sep = existing && !existing.endsWith('\n\n') ? (existing.endsWith('\n') ? '\n' : '\n\n') : ''
    mkdirSync(join(HOME, '.claude'), { recursive: true })
    writeFileSync(GLOBAL_CLAUDE_MD, existing + sep + block + '\n')
  }
}

function getMemoryDir(projectPath) {
  return join(
    process.env.HOME || os.homedir(),
    '.claude', 'projects', encodePath(projectPath), 'memory'
  )
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/m)
  if (!m) return { name: '', description: '', type: 'unknown', content: text.trim() }
  const fm = {}
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
  }
  return {
    name: fm.name || '',
    description: fm.description || '',
    type: fm.type || 'unknown',
    content: m[2].trim()
  }
}

function buildFrontmatter(name, type, description) {
  const safeName = name.replace(/\n/g, ' ').replace(/---/g, '---')
  const safeDesc = description.replace(/\n/g, ' ')
  return `---\nname: ${safeName}\ndescription: ${safeDesc}\ntype: ${type}\n---\n\n`
}

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '').slice(0, 40) || 'memory'
}

function rebuildIndex(dir) {
  const files = readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'MEMORY.md')
  const lines = files.map(f => {
    try {
      const { name, description } = parseFrontmatter(readFileSync(join(dir, f), 'utf8'))
      return `- [${name || f}](${f}) — ${description || ''}`
    } catch { return `- [${f}](${f})` }
  })
  writeFileSync(join(dir, 'MEMORY.md'), `# Memory Index\n\n${lines.join('\n')}\n`)
}

export function listMemories(projectPath) {
  const dir = getMemoryDir(projectPath)
  if (!existsSync(dir)) return []
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.md') && f !== 'MEMORY.md')
      .map(f => {
        const parsed = parseFrontmatter(readFileSync(join(dir, f), 'utf8'))
        return { file: f, ...parsed }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch { return [] }
}

export function getMemory(projectPath, file) {
  const dir = getMemoryDir(projectPath)
  const path = join(dir, file)
  if (!existsSync(path)) return null
  return { file, ...parseFrontmatter(readFileSync(path, 'utf8')) }
}

export function saveMemory(projectPath, existingFile, { name, type, description, content }) {
  const dir = getMemoryDir(projectPath)
  mkdirSync(dir, { recursive: true })

  let file = existingFile
  if (!file) {
    let base = slugify(name)
    file = `${base}.md`
    let n = 2
    while (existsSync(join(dir, file))) { file = `${base}_${n++}.md` }
  }

  writeFileSync(join(dir, file), buildFrontmatter(name, type, description) + content)
  rebuildIndex(dir)
  return file
}

export function deleteMemory(projectPath, file) {
  const dir = getMemoryDir(projectPath)
  const path = join(dir, file)
  if (existsSync(path)) unlinkSync(path)
  rebuildIndex(dir)
}

// --- 全局记忆（~/.claude/memory/）---
export function listGlobalMemories() {
  if (!existsSync(GLOBAL_MEMORY_DIR)) return []
  try {
    return readdirSync(GLOBAL_MEMORY_DIR)
      .filter(f => f.endsWith('.md') && f !== 'MEMORY.md')
      .map(f => {
        const parsed = parseFrontmatter(readFileSync(join(GLOBAL_MEMORY_DIR, f), 'utf8'))
        return { file: f, ...parsed }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch { return [] }
}

export function getGlobalMemory(file) {
  const path = join(GLOBAL_MEMORY_DIR, file)
  if (!existsSync(path)) return null
  return { file, ...parseFrontmatter(readFileSync(path, 'utf8')) }
}

export function saveGlobalMemory(existingFile, { name, type, description, content }) {
  mkdirSync(GLOBAL_MEMORY_DIR, { recursive: true })
  let file = existingFile
  if (!file) {
    let base = slugify(name)
    file = `${base}.md`
    let n = 2
    while (existsSync(join(GLOBAL_MEMORY_DIR, file))) { file = `${base}_${n++}.md` }
  }
  writeFileSync(join(GLOBAL_MEMORY_DIR, file), buildFrontmatter(name, type, description) + content)
  rebuildIndex(GLOBAL_MEMORY_DIR)
  syncGlobalMemoriesToClaudeMd()
  return file
}

export function deleteGlobalMemory(file) {
  const path = join(GLOBAL_MEMORY_DIR, file)
  if (existsSync(path)) unlinkSync(path)
  rebuildIndex(GLOBAL_MEMORY_DIR)
  syncGlobalMemoriesToClaudeMd()
}
