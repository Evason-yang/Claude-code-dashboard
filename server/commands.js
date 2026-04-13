import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import os from 'os'

const GLOBAL_COMMANDS_DIR = join(os.homedir(), '.claude', 'commands')
const INSTALLED_PLUGINS_PATH = join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json')

function getProjectCommandsDir(projectPath) {
  return join(projectPath, '.claude', 'commands')
}

// 从已安装插件里扫描 commands 目录
function readPluginCommands() {
  if (!existsSync(INSTALLED_PLUGINS_PATH)) return []
  try {
    const installed = JSON.parse(readFileSync(INSTALLED_PLUGINS_PATH, 'utf8')).plugins || {}
    const cmds = []
    for (const [id, versions] of Object.entries(installed)) {
      const latest = Array.isArray(versions) ? versions[versions.length - 1] : versions
      const installPath = latest?.installPath || ''
      const cmdDir = join(installPath, 'commands')
      if (!existsSync(cmdDir)) continue
      for (const f of readdirSync(cmdDir).filter(f => f.endsWith('.md'))) {
        const { description, content } = parseFrontmatter(readFileSync(join(cmdDir, f), 'utf8'))
        cmds.push({ file: f, name: basename(f, '.md'), description, content, scope: 'plugin', plugin: id, readonly: true })
      }
    }
    return cmds.sort((a, b) => a.name.localeCompare(b.name))
  } catch { return [] }
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/m)
  if (!m) return { description: '', content: text.trim() }
  const fm = {}
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
  }
  return { description: fm.description || '', content: m[2].trim() }
}

function readCommandsFromDir(dir, scope) {
  if (!existsSync(dir)) return []
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const { description, content } = parseFrontmatter(readFileSync(join(dir, f), 'utf8'))
        return { file: f, name: basename(f, '.md'), description, content, scope }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch { return [] }
}

export function listCommands(projectPath) {
  return [
    ...readPluginCommands(),
    ...readCommandsFromDir(GLOBAL_COMMANDS_DIR, 'global'),
    ...(projectPath ? readCommandsFromDir(getProjectCommandsDir(projectPath), 'project') : [])
  ]
}

export function saveCommand(scope, projectPath, existingFile, { name, description, content }) {
  const dir = scope === 'global' ? GLOBAL_COMMANDS_DIR : getProjectCommandsDir(projectPath)
  mkdirSync(dir, { recursive: true })
  const file = existingFile || `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.md`
  const fm = description ? `---\ndescription: ${description.replace(/\n/g, ' ')}\n---\n\n` : ''
  writeFileSync(join(dir, file), fm + content)
  return file
}

export function deleteCommand(scope, projectPath, file) {
  const dir = scope === 'global' ? GLOBAL_COMMANDS_DIR : getProjectCommandsDir(projectPath)
  const path = join(dir, file)
  if (existsSync(path)) unlinkSync(path)
}
