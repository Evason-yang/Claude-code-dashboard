import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

function getSettingsPath(projectPath) {
  return join(projectPath, '.claude', 'settings.local.json')
}

export function readToolPerms(projectPath) {
  const path = getSettingsPath(projectPath)
  if (!existsSync(path)) return { allow: [], deny: [] }
  try {
    const d = JSON.parse(readFileSync(path, 'utf8'))
    return {
      allow: d.permissions?.allow || [],
      deny: d.permissions?.deny || []
    }
  } catch { return { allow: [], deny: [] } }
}

export function writeToolPerms(projectPath, { allow, deny }) {
  const path = getSettingsPath(projectPath)
  mkdirSync(join(projectPath, '.claude'), { recursive: true })
  let existing = {}
  if (existsSync(path)) {
    try { existing = JSON.parse(readFileSync(path, 'utf8')) } catch {}
  }
  if (!existing.permissions) existing.permissions = {}
  existing.permissions.allow = allow || []
  existing.permissions.deny = deny || []
  // 清理空数组
  if (!existing.permissions.deny.length) delete existing.permissions.deny
  writeFileSync(path, JSON.stringify(existing, null, 2))
}
