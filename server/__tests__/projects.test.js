import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import os from 'os'

const tmpDir = join(os.tmpdir(), 'mtcc-projects-' + Date.now())

const { scanDir, buildProjectList, getProjectById } = await import('../projects.js')

describe('projects', () => {
  beforeEach(() => {
    mkdirSync(join(tmpDir, 'proj-a', '.claude'), { recursive: true })
    mkdirSync(join(tmpDir, 'proj-b'), { recursive: true }) // no .claude
    mkdirSync(join(tmpDir, 'proj-c', '.claude'), { recursive: true })
    // 写一个 session 文件给 proj-a，用于最后活动时间
    writeFileSync(
      join(tmpDir, 'proj-a', '.claude', 'session.jsonl'),
      '{"timestamp":"2026-04-10T10:00:00.000Z"}\n'
    )
  })
  afterEach(() => rmSync(tmpDir, { recursive: true, force: true }))

  it('scanDir finds only directories with .claude/', () => {
    const found = scanDir(tmpDir)
    const names = found.map(p => p.name)
    expect(names).toContain('proj-a')
    expect(names).toContain('proj-c')
    expect(names).not.toContain('proj-b')
  })

  it('project has id, name, path, lastActive', () => {
    const found = scanDir(tmpDir)
    const a = found.find(p => p.name === 'proj-a')
    expect(a).toMatchObject({
      name: 'proj-a',
      path: join(tmpDir, 'proj-a')
    })
    expect(a.id).toBeTruthy()
    expect(a.lastActive).toBeTruthy()
  })

  it('buildProjectList merges scanDirs and manualProjects, deduplicates', () => {
    const list = buildProjectList(
      { scanDirs: [tmpDir], manualProjects: [join(tmpDir, 'proj-a')] }
    )
    const names = list.map(p => p.name)
    expect(names.filter(n => n === 'proj-a').length).toBe(1)
  })

  it('getProjectById returns correct project', () => {
    const list = buildProjectList({ scanDirs: [tmpDir], manualProjects: [] })
    const a = list.find(p => p.name === 'proj-a')
    expect(getProjectById(list, a.id)).toEqual(a)
  })
})
