import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import os from 'os'

const GLOBAL_CLAUDE_MD = join(os.homedir(), '.claude', 'CLAUDE.md')

// 获取项目的 CLAUDE.md 路径（优先项目根目录，其次 .claude/ 子目录）
export function getProjectClaudeMdPath(projectPath) {
  const root = join(projectPath, 'CLAUDE.md')
  const sub = join(projectPath, '.claude', 'CLAUDE.md')
  if (existsSync(root)) return root
  if (existsSync(sub)) return sub
  return root  // 默认写到根目录
}

export function readPrompt(scope, projectPath) {
  const path = scope === 'global' ? GLOBAL_CLAUDE_MD : getProjectClaudeMdPath(projectPath)
  if (!existsSync(path)) return { path, content: '', exists: false }
  return { path, content: readFileSync(path, 'utf8'), exists: true }
}

export function writePrompt(scope, projectPath, content) {
  const path = scope === 'global' ? GLOBAL_CLAUDE_MD : getProjectClaudeMdPath(projectPath)
  const dir = join(path, '..')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path, content)
  return path
}
