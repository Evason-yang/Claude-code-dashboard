import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import os from 'os'

function getConfigPath() {
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir()
  const dir = join(home, '.mtclaudecode')
  return { dir, path: join(dir, 'config.json') }
}

export const DEFAULT_CONFIG = {
  scanDirs: [],
  manualProjects: []
}

export function loadConfig() {
  const { path } = getConfigPath()
  if (!existsSync(path)) return { ...DEFAULT_CONFIG }
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(cfg) {
  const { dir, path } = getConfigPath()
  mkdirSync(dir, { recursive: true })
  writeFileSync(path, JSON.stringify(cfg, null, 2))
}
