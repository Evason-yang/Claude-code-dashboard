# 记忆管理模块 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Claude Code 项目管理器中添加记忆管理模块，支持查看、新建、编辑、删除各项目的 Claude Code 记忆文件。

**Architecture:** 新增 `server/memories.js` 处理 `~/.claude/projects/<encoded>/memory/*.md` 的读写，在 `server/index.js` 注册 REST API，前端新增 `MemoryTab`（项目 Tab）、`MemoriesPage`（全局页）、`MemoryEditor`（弹窗）三个组件，并接入现有路由和侧边栏。

**Tech Stack:** Node.js ESM, Express 4, React 18, React Router 6，无新依赖

---

## 文件结构

```
server/
  memories.js              # 新建：记忆文件读写逻辑
  index.js                 # 修改：注册记忆 API 路由

client/components/
  MemoryEditor.jsx         # 新建：新建/编辑弹窗
  MemoryTab.jsx            # 新建：项目详情页记忆 Tab
  MemoriesPage.jsx         # 新建：全局记忆管理页
  ProjectDetail.jsx        # 修改：加 memories Tab
  App.jsx                  # 修改：加 /memories 路由
  Sidebar.jsx              # 修改：加「记忆管理」导航项
```

---

### Task 1: server/memories.js — 记忆文件读写模块

**Files:**
- Create: `server/memories.js`
- Test: `server/__tests__/memories.test.js`

- [ ] **Step 1: 写失败测试**

新建 `server/__tests__/memories.test.js`：

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import os from 'os'

const tmpDir = join(os.tmpdir(), 'mtcc-memories-' + Date.now())
// 模拟项目路径，memories.js 会把 / 换成 - 来定位 ~/.claude/projects/<encoded>/memory/
// 为测试方便，直接覆盖 HOME 让 getClaudeProjectDir 指向临时目录
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
    const { readFileSync } = require('fs')
  })

  it('deleteMemory removes file', () => {
    deleteMemory(projectPath, 'user_profile.md')
    expect(listMemories(projectPath).length).toBe(0)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /path/to/claude-code-dashboard && npm test -- --reporter=verbose 2>&1 | tail -15
```

期望：FAIL，`Cannot find module '../memories.js'`

- [ ] **Step 3: 实现 server/memories.js**

```js
import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import os from 'os'
import { encodePath } from './sessions.js'

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
  return `---\nname: ${name}\ndescription: ${description}\ntype: ${type}\n---\n\n`
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
    // 新建：生成不冲突的文件名
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
```

- [ ] **Step 4: 修复测试中的 require 语法（ESM 项目用 import）**

将 `server/__tests__/memories.test.js` 的 saveMemory 测试改为：

```js
  it('saveMemory creates new file and MEMORY.md', () => {
    saveMemory(projectPath, null, { name: 'New Entry', type: 'feedback', description: '测试', content: '内容' })
    const list = listMemories(projectPath)
    expect(list.length).toBe(2)
    const idx = readFileSync(join(memDir(), 'MEMORY.md'), 'utf8')
    expect(idx).toContain('New Entry')
  })
```

并在文件顶部 import 中加入 `readFileSync`：

```js
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs'
```

- [ ] **Step 5: 运行测试确认通过**

```bash
npm test -- --reporter=verbose 2>&1 | tail -20
```

期望：memories 的 4 个测试全部 PASS，总测试数增加到 15

- [ ] **Step 6: Commit**

```bash
git add server/memories.js server/__tests__/memories.test.js
git commit -m "feat: add memories read/write module"
```

---

### Task 2: server/index.js — 注册记忆 API 路由

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: 在 server/index.js 顶部 import 中加入 memories 模块**

在 `import { getGitLog } from './git.js'` 后加一行：

```js
import { listMemories, getMemory, saveMemory, deleteMemory } from './memories.js'
```

- [ ] **Step 2: 在 `// --- Config ---` 注释之前加入记忆路由**

```js
// --- Memories ---
app.get('/api/projects/:id/memories', (req, res) => {
  const cfg = loadConfig()
  const proj = getProjectById(buildProjectList(cfg), req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  res.json(listMemories(proj.path))
})

app.get('/api/projects/:id/memories/:file', (req, res) => {
  const cfg = loadConfig()
  const proj = getProjectById(buildProjectList(cfg), req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  const m = getMemory(proj.path, req.params.file)
  if (!m) return res.status(404).json({ error: 'Memory not found' })
  res.json(m)
})

app.post('/api/projects/:id/memories', (req, res) => {
  const cfg = loadConfig()
  const proj = getProjectById(buildProjectList(cfg), req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  const { name, type, description, content } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const file = saveMemory(proj.path, null, { name, type: type || 'user', description: description || '', content: content || '' })
  res.json({ ok: true, file })
})

app.put('/api/projects/:id/memories/:file', (req, res) => {
  const cfg = loadConfig()
  const proj = getProjectById(buildProjectList(cfg), req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  const { name, type, description, content } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  saveMemory(proj.path, req.params.file, { name, type: type || 'user', description: description || '', content: content || '' })
  res.json({ ok: true })
})

app.delete('/api/projects/:id/memories/:file', (req, res) => {
  const cfg = loadConfig()
  const proj = getProjectById(buildProjectList(cfg), req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  deleteMemory(proj.path, req.params.file)
  res.json({ ok: true })
})

app.get('/api/memories', (req, res) => {
  const cfg = loadConfig()
  const projects = buildProjectList(cfg)
  const result = projects
    .map(p => ({ id: p.id, name: p.name, memories: listMemories(p.path) }))
    .filter(p => p.memories.length > 0)
  res.json(result)
})
```

- [ ] **Step 3: 手动验证 API**

```bash
# 重启服务
lsof -ti:3000 | xargs kill -9 2>/dev/null; sleep 1
node server/index.js &
sleep 2
PROJ=$(curl -s http://localhost:3000/api/projects | python3 -c "import sys,json; ps=json.load(sys.stdin); print(ps[0]['id'] if ps else '')")
curl -s "http://localhost:3000/api/projects/$PROJ/memories" | python3 -m json.tool | head -20
kill %1 2>/dev/null
```

期望：返回 JSON 数组，包含 `user_profile.md` 条目

- [ ] **Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat: register memory CRUD API routes"
```

---

### Task 3: client/components/MemoryEditor.jsx — 新建/编辑弹窗

**Files:**
- Create: `client/components/MemoryEditor.jsx`

- [ ] **Step 1: 创建 MemoryEditor.jsx**

```jsx
import React, { useState, useEffect } from 'react'

const TYPE_COLORS = {
  user:      '#58a6ff',
  feedback:  '#f0883e',
  project:   '#3fb950',
  reference: '#d2a8ff',
  unknown:   '#8b949e',
}

const TYPES = ['user', 'feedback', 'project', 'reference']

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, width: 520, maxWidth: '92vw', display: 'flex', flexDirection: 'column', gap: 14 },
  title: { fontSize: 15, fontWeight: 700 },
  label: { fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  input: { width: '100%', padding: '7px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)' },
  textarea: { width: '100%', padding: '8px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', resize: 'vertical', minHeight: 140, fontFamily: 'inherit', lineHeight: 1.6 },
  typeRow: { display: 'flex', gap: 8 },
  typeBtn: { padding: '5px 12px', fontSize: 12, borderRadius: 5, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg2)', color: 'var(--text2)', fontWeight: 500 },
  row: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  btn: { padding: '7px 16px', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg2)', color: 'var(--text)' },
  btnPrimary: { background: 'var(--accent)', color: '#fff', border: 'none' },
}

export default function MemoryEditor({ projectId, memory, onClose, onSaved }) {
  const isEdit = !!memory
  const [name, setName] = useState(memory?.name || '')
  const [type, setType] = useState(memory?.type || 'user')
  const [description, setDescription] = useState(memory?.description || '')
  const [content, setContent] = useState(memory?.content || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return alert('标题不能为空')
    setSaving(true)
    const url = isEdit
      ? `/api/projects/${projectId}/memories/${encodeURIComponent(memory.file)}`
      : `/api/projects/${projectId}/memories`
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), type, description: description.trim(), content })
    })
    setSaving(false)
    if (res.ok) { onSaved(); onClose() }
    else alert('保存失败')
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.title}>{isEdit ? '编辑记忆' : '新建记忆'}</div>

        <div>
          <div style={S.label}>标题</div>
          <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="记忆名称" autoFocus />
        </div>

        <div>
          <div style={S.label}>类型</div>
          <div style={S.typeRow}>
            {TYPES.map(t => {
              const color = TYPE_COLORS[t]
              const active = type === t
              return (
                <button key={t} onClick={() => setType(t)} style={{
                  ...S.typeBtn,
                  ...(active ? { background: `${color}22`, borderColor: color, color } : {})
                }}>{t}</button>
              )
            })}
          </div>
        </div>

        <div>
          <div style={S.label}>摘要描述</div>
          <input style={S.input} value={description} onChange={e => setDescription(e.target.value)} placeholder="一句话描述这条记忆的用途" />
        </div>

        <div>
          <div style={S.label}>内容</div>
          <textarea style={S.textarea} value={content} onChange={e => setContent(e.target.value)} placeholder="记忆正文..." />
        </div>

        <div style={S.row}>
          <button style={S.btn} onClick={onClose}>取消</button>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/components/MemoryEditor.jsx
git commit -m "feat: add MemoryEditor modal component"
```

---

### Task 4: client/components/MemoryTab.jsx — 项目记忆 Tab

**Files:**
- Create: `client/components/MemoryTab.jsx`

- [ ] **Step 1: 创建 MemoryTab.jsx**

```jsx
import React, { useEffect, useState } from 'react'
import MemoryEditor from './MemoryEditor.jsx'

const TYPE_COLORS = {
  user: '#58a6ff', feedback: '#f0883e', project: '#3fb950',
  reference: '#d2a8ff', unknown: '#8b949e',
}

function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] || TYPE_COLORS.unknown
  return (
    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, fontWeight: 600, color, border: `1px solid ${color}44`, background: `${color}18`, flexShrink: 0 }}>
      {type}
    </span>
  )
}

export default function MemoryTab({ project, refreshKey }) {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [editor, setEditor] = useState(null)  // null | 'new' | memory对象

  function load() {
    setLoading(true)
    fetch(`/api/projects/${project.id}/memories`)
      .then(r => r.json())
      .then(data => { setMemories(data); setLoading(false) })
  }

  useEffect(() => { load() }, [project.id, refreshKey])

  async function handleDelete(memory) {
    if (!window.confirm(`确认删除「${memory.name}」？`)) return
    await fetch(`/api/projects/${project.id}/memories/${encodeURIComponent(memory.file)}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{memories.length} 条记忆</div>
        <button
          onClick={() => setEditor('new')}
          style={{ marginLeft: 'auto', padding: '5px 14px', fontSize: 12, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
        >+ 新建</button>
      </div>

      {loading
        ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
        : memories.length === 0
          ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>暂无记忆，点击「新建」创建第一条</div>
          : memories.map(m => (
              <div key={m.file} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, marginBottom: 8, overflow: 'hidden' }}>
                {/* 列表行 */}
                <div
                  onClick={() => setExpanded(expanded === m.file ? null : m.file)}
                  style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <TypeBadge type={m.type} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                  {m.description && (
                    <span style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{m.description}</span>
                  )}
                  <button onClick={e => { e.stopPropagation(); setEditor(m) }} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>编辑</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(m) }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>删除</button>
                  <span style={{ fontSize: 10, color: 'var(--text2)' }}>{expanded === m.file ? '▲' : '▼'}</span>
                </div>
                {/* 展开正文 */}
                {expanded === m.file && (
                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7, background: 'var(--bg3)' }}>
                    {m.content || <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>（无内容）</span>}
                  </div>
                )}
              </div>
            ))
      }

      {editor && (
        <MemoryEditor
          projectId={project.id}
          memory={editor === 'new' ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/components/MemoryTab.jsx
git commit -m "feat: add MemoryTab component for project detail"
```

---

### Task 5: client/components/MemoriesPage.jsx — 全局记忆管理页

**Files:**
- Create: `client/components/MemoriesPage.jsx`

- [ ] **Step 1: 创建 MemoriesPage.jsx**

```jsx
import React, { useEffect, useState } from 'react'
import MemoryEditor from './MemoryEditor.jsx'

const TYPE_COLORS = {
  user: '#58a6ff', feedback: '#f0883e', project: '#3fb950',
  reference: '#d2a8ff', unknown: '#8b949e',
}

function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] || TYPE_COLORS.unknown
  return (
    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, fontWeight: 600, color, border: `1px solid ${color}44`, background: `${color}18`, flexShrink: 0 }}>
      {type}
    </span>
  )
}

export default function MemoriesPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})  // { 'projId:file': true }
  const [editor, setEditor] = useState(null)    // { projectId, memory | null }

  function load() {
    setLoading(true)
    fetch('/api/memories')
      .then(r => r.json())
      .then(data => { setGroups(data); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  function toggleExpand(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleDelete(projectId, memory) {
    if (!window.confirm(`确认删除「${memory.name}」？`)) return
    await fetch(`/api/projects/${projectId}/memories/${encodeURIComponent(memory.file)}`, { method: 'DELETE' })
    load()
  }

  const totalCount = groups.reduce((s, g) => s + g.memories.length, 0)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>记忆管理</div>
        <button onClick={load} title="刷新" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}>↻</button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>共 {totalCount} 条记忆，来自 {groups.length} 个项目</div>

      {loading
        ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
        : groups.length === 0
          ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>暂无记忆数据</div>
          : groups.map(g => (
              <div key={g.id} style={{ marginBottom: 20 }}>
                {/* 项目标题 */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{g.memories.length} 条</div>
                  <button
                    onClick={() => setEditor({ projectId: g.id, memory: null })}
                    style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 11, borderRadius: 4, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
                  >+ 新建</button>
                </div>
                {/* 记忆列表 */}
                {g.memories.map(m => {
                  const key = `${g.id}:${m.file}`
                  return (
                    <div key={m.file} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, marginBottom: 6, overflow: 'hidden' }}>
                      <div onClick={() => toggleExpand(key)} style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TypeBadge type={m.type} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                        {m.description && (
                          <span style={{ fontSize: 11, color: 'var(--text2)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.description}</span>
                        )}
                        <button onClick={e => { e.stopPropagation(); setEditor({ projectId: g.id, memory: m }) }} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>编辑</button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(g.id, m) }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>删除</button>
                        <span style={{ fontSize: 10, color: 'var(--text2)' }}>{expanded[key] ? '▲' : '▼'}</span>
                      </div>
                      {expanded[key] && (
                        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7, background: 'var(--bg3)' }}>
                          {m.content || <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>（无内容）</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
      }

      {editor && (
        <MemoryEditor
          projectId={editor.projectId}
          memory={editor.memory}
          onClose={() => setEditor(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/components/MemoriesPage.jsx
git commit -m "feat: add MemoriesPage global memory management"
```

---

### Task 6: 接入路由和导航

**Files:**
- Modify: `client/components/ProjectDetail.jsx`
- Modify: `client/App.jsx`
- Modify: `client/components/Sidebar.jsx`

- [ ] **Step 1: 修改 ProjectDetail.jsx，加记忆 Tab**

在 `import SkillsTab from './SkillsTab.jsx'` 后加：

```jsx
import MemoryTab from './MemoryTab.jsx'
```

在 `tabs` 数组末尾加：

```jsx
{ label: '记忆', path: 'memories' },
```

在 Routes 中加：

```jsx
<Route path="memories" element={<MemoryTab project={project} refreshKey={refreshKey} />} />
```

- [ ] **Step 2: 修改 App.jsx，加全局路由**

在 `import ModelsPage from './components/ModelsPage.jsx'` 后加：

```jsx
import MemoriesPage from './components/MemoriesPage.jsx'
```

在 Routes 中加（放在 `/skills` 路由后）：

```jsx
<Route path="/memories" element={<MemoriesPage />} />
```

- [ ] **Step 3: 修改 Sidebar.jsx，加导航项**

在 `globalNav` 数组中加（放在 `Skill 管理` 之后）：

```jsx
{ label: '记忆管理', icon: '◎', path: '/memories' },
```

- [ ] **Step 4: 构建验证**

```bash
npm run build 2>&1 | grep -E "error|✓ built"
```

期望：`✓ built`，无报错

- [ ] **Step 5: Commit**

```bash
git add client/components/ProjectDetail.jsx client/App.jsx client/components/Sidebar.jsx
git commit -m "feat: wire memory tab and global memories page into routing and nav"
```

---

### Task 7: 端到端验证

**Files:** 无新文件

- [ ] **Step 1: 运行全部测试**

```bash
npm test -- --reporter=verbose 2>&1 | tail -15
```

期望：所有测试通过（含新增的 memories 4 个测试）

- [ ] **Step 2: 启动并验证**

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null; sleep 1
node server/index.js &
sleep 2
# 验证全局 API
curl -s http://localhost:3000/api/memories | python3 -c "import sys,json; gs=json.load(sys.stdin); print(f'{len(gs)} projects with memories')"
# 验证项目 API
PROJ=$(curl -s http://localhost:3000/api/projects | python3 -c "import sys,json; ps=json.load(sys.stdin); print(ps[0]['id'] if ps else '')")
curl -s "http://localhost:3000/api/projects/$PROJ/memories" | python3 -m json.tool | head -15
kill %1 2>/dev/null
```

期望：全局 API 返回有记忆的项目列表，项目 API 返回该项目的记忆数组

- [ ] **Step 3: 最终 commit**

```bash
git add -A
git commit -m "chore: verify memory management end-to-end"
```
