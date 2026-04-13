import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import os from 'os'

const tmpDir = join(os.tmpdir(), 'mtcc-memories-' + Date.now())
const fakeHome = join(tmpDir, 'home')
process.env.HOME = fakeHome

const { listMemories, getMemory, saveMemory, deleteMemory } = await import('../memories.js')

const projectPath = '/Users/test/myproject'

function memDir() {
  const encoded = projectPath.replace(/\//g, '-')
  return join(fakeHome, '.claude', 'projects', encoded, 'memory')
}

describe('memories', () => {
  beforeEach(() => {
    mkdirSync(memDir(), { recursive: true })
    writeFileSync(join(memDir(), 'user_profile.md'), [
      '---',
      'name: User Profile',
      'description: 用户偏好',
      'type: user',
      '---',
      '',
      '- 始终用中文'
    ].join('\n'))
  })
  afterEach(() => rmSync(tmpDir, { recursive: true, force: true }))

  it('listMemories returns parsed entries', () => {
    const list = listMemories(projectPath)
    expect(list.length).toBe(1)
    expect(list[0]).toMatchObject({ file: 'user_profile.md', name: 'User Profile', type: 'user' })
  })

  it('getMemory returns content', () => {
    const m = getMemory(projectPath, 'user_profile.md')
    expect(m.content).toContain('始终用中文')
  })

  it('saveMemory creates new file and MEMORY.md', () => {
    saveMemory(projectPath, null, { name: 'New Entry', type: 'feedback', description: '测试', content: '内容' })
    const list = listMemories(projectPath)
    expect(list.length).toBe(2)
    const idx = readFileSync(join(memDir(), 'MEMORY.md'), 'utf8')
    expect(idx).toContain('New Entry')
  })

  it('deleteMemory removes file', () => {
    deleteMemory(projectPath, 'user_profile.md')
    expect(listMemories(projectPath).length).toBe(0)
  })
})
