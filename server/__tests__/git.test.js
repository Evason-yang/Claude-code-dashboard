import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import os from 'os'

const tmpDir = join(os.tmpdir(), 'mtcc-git-' + Date.now())

const { getGitLog } = await import('../git.js')

describe('git', () => {
  it('returns commits from a real git repo', () => {
    mkdirSync(tmpDir, { recursive: true })
    execSync('git init && git config user.email "t@t.com" && git config user.name "T"', { cwd: tmpDir })
    execSync('touch README.md && git add . && git commit -m "init"', { cwd: tmpDir })
    const log = getGitLog(tmpDir)
    expect(log.length).toBe(1)
    expect(log[0]).toMatchObject({
      hash: expect.stringMatching(/^[0-9a-f]{7}$/),
      message: 'init',
      author: 'T'
    })
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns empty array for non-git directory', () => {
    expect(getGitLog('/tmp')).toEqual([])
  })
})
