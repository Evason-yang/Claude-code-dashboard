import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import os from 'os'

// 用临时目录替代真实 home
const tmpHome = join(os.tmpdir(), 'mtcc-test-' + Date.now())
process.env.HOME = tmpHome

const { loadConfig, saveConfig, DEFAULT_CONFIG } = await import('../config.js')

describe('config', () => {
  beforeEach(() => {
    rmSync(tmpHome, { recursive: true, force: true })
    mkdirSync(join(tmpHome, '.mtclaudecode'), { recursive: true })
  })
  afterEach(() => rmSync(tmpHome, { recursive: true, force: true }))

  it('returns default config when file does not exist', () => {
    const cfg = loadConfig()
    expect(cfg).toEqual(DEFAULT_CONFIG)
  })

  it('saves and loads config', () => {
    const cfg = { scanDirs: ['/foo'], manualProjects: ['/bar'] }
    saveConfig(cfg)
    expect(loadConfig()).toEqual(cfg)
  })
})
