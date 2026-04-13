import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import os from 'os'

const tmpDir = join(os.tmpdir(), 'mtcc-sessions-' + Date.now())
const claudeDir = join(tmpDir, '.claude')

const { listSessions, getSession } = await import('../sessions.js')

const session1Lines = [
  JSON.stringify({ type: 'user', message: { role: 'user', content: '帮我设计一个登录页面' }, timestamp: '2026-04-10T08:00:00.000Z', uuid: 'msg-1' }),
  JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: '好的，我来帮你设计。' }, timestamp: '2026-04-10T08:00:05.000Z', uuid: 'msg-2' })
].join('\n')

describe('sessions', () => {
  beforeEach(() => {
    mkdirSync(claudeDir, { recursive: true })
    writeFileSync(join(claudeDir, 'abc123.jsonl'), session1Lines)
    writeFileSync(join(claudeDir, 'def456.jsonl'), JSON.stringify({ type: 'user', message: { role: 'user', content: '讨论技术栈' }, timestamp: '2026-04-09T10:00:00.000Z', uuid: 'msg-3' }))
  })
  afterEach(() => rmSync(tmpDir, { recursive: true, force: true }))

  it('listSessions returns list sorted by newest first', () => {
    const list = listSessions(tmpDir)
    expect(list.length).toBe(2)
    expect(list[0].id).toBe('abc123')
    expect(list[0].title).toBe('帮我设计一个登录页面')
    expect(list[0].messageCount).toBe(2)
    expect(list[1].id).toBe('def456')
  })

  it('getSession returns full messages', () => {
    const msgs = getSession(tmpDir, 'abc123')
    expect(msgs.length).toBe(2)
    expect(msgs[0].role).toBe('user')
    expect(msgs[0].content).toBe('帮我设计一个登录页面')
  })

  it('listSessions returns empty array when .claude dir missing', () => {
    expect(listSessions('/nonexistent/path')).toEqual([])
  })
})
