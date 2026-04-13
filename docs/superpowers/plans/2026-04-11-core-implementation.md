# Claude Code 项目管理器（核心）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Claude Code 项目管理器的核心功能：项目管理、会话历史查看、Git 记录，以本地 Web UI 形式运行。

**Architecture:** Express 后端提供 REST API 读取本地文件系统，React 前端（Vite 构建）提供 UI，build 后由 Express 静态托管。无数据库，配置持久化到 `~/.mtclaudecode/config.json`。

**Tech Stack:** Node.js 18+, Express 4, React 18, Vite 5, React Router 6, Vitest（后端测试）, supertest

---

## 文件结构

```
mtClaudeCode/
├── server/
│   ├── index.js          # Express 入口：API 路由 + 静态文件服务
│   ├── config.js         # 读写 ~/.mtclaudecode/config.json
│   ├── projects.js       # 项目扫描、列表管理
│   ├── sessions.js       # 读取 .claude/ 下的 JSONL 会话文件
│   └── git.js            # 执行 git log 并解析
├── server/__tests__/
│   ├── config.test.js
│   ├── projects.test.js
│   ├── sessions.test.js
│   └── git.test.js
├── client/
│   ├── index.html
│   ├── main.jsx
│   ├── App.jsx
│   └── components/
│       ├── Sidebar.jsx
│       ├── ProjectDetail.jsx
│       ├── OverviewTab.jsx
│       ├── SessionList.jsx
│       ├── GitLog.jsx
│       └── OnboardingModal.jsx
├── package.json
└── vite.config.js
```

---

### Task 1: 项目初始化与依赖安装

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `.gitignore`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "mt-claude-code",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev:server": "node --watch server/index.js",
    "dev:client": "vite",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "build": "vite build",
    "start": "npm run build && node server/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "open": "^10.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "concurrently": "^8.2.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "vite": "^5.1.4",
    "vitest": "^1.3.1",
    "supertest": "^6.3.4"
  }
}
```

- [ ] **Step 2: 创建 vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'server/public'
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
```

- [ ] **Step 3: 创建 .gitignore**

```
node_modules/
server/public/
.superpowers/
dist/
```

- [ ] **Step 4: 安装依赖**

```bash
npm install
```

期望输出：`added N packages` 无报错。

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.js .gitignore
git commit -m "chore: init project with Express + React + Vite"
```

---

### Task 2: 配置模块

**Files:**
- Create: `server/config.js`
- Create: `server/__tests__/config.test.js`

- [ ] **Step 1: 写失败测试**

新建 `server/__tests__/config.test.js`：

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import os from 'os'

// 用临时目录替代真实 home
const tmpHome = join(os.tmpdir(), 'mtcc-test-' + Date.now())
process.env.HOME = tmpHome

const { loadConfig, saveConfig, DEFAULT_CONFIG } = await import('../config.js')

describe('config', () => {
  beforeEach(() => mkdirSync(join(tmpHome, '.mtclaudecode'), { recursive: true }))
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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -- --reporter=verbose 2>&1 | head -30
```

期望：FAIL，提示 `Cannot find module '../config.js'`

- [ ] **Step 3: 实现 config.js**

新建 `server/config.js`：

```js
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import os from 'os'

const CONFIG_DIR = join(os.homedir(), '.mtclaudecode')
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

export const DEFAULT_CONFIG = {
  scanDirs: [],
  manualProjects: []
}

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(cfg) {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2))
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -- --reporter=verbose 2>&1 | head -30
```

期望：PASS，2 tests passed

- [ ] **Step 5: Commit**

```bash
git add server/config.js server/__tests__/config.test.js
git commit -m "feat: add config read/write module"
```

---

### Task 3: 项目扫描模块

**Files:**
- Create: `server/projects.js`
- Create: `server/__tests__/projects.test.js`

- [ ] **Step 1: 写失败测试**

新建 `server/__tests__/projects.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -- --reporter=verbose 2>&1 | head -40
```

期望：FAIL，`Cannot find module '../projects.js'`

- [ ] **Step 3: 实现 projects.js**

新建 `server/projects.js`：

```js
import { readdirSync, statSync, existsSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { createHash } from 'crypto'

function makeId(path) {
  return createHash('md5').update(path).digest('hex').slice(0, 8)
}

function getLastActive(projectPath) {
  const claudeDir = join(projectPath, '.claude')
  try {
    const files = readdirSync(claudeDir).filter(f => f.endsWith('.jsonl'))
    if (files.length === 0) return null
    let latest = null
    for (const f of files) {
      const lines = readFileSync(join(claudeDir, f), 'utf8').trim().split('\n')
      for (const line of lines.reverse()) {
        try {
          const obj = JSON.parse(line)
          if (obj.timestamp) {
            const t = new Date(obj.timestamp)
            if (!latest || t > latest) latest = t
            break
          }
        } catch { /* skip */ }
      }
    }
    return latest ? latest.toISOString() : null
  } catch {
    return null
  }
}

export function scanDir(dir) {
  if (!existsSync(dir)) return []
  try {
    return readdirSync(dir)
      .filter(name => {
        const full = join(dir, name)
        return statSync(full).isDirectory() && existsSync(join(full, '.claude'))
      })
      .map(name => {
        const path = join(dir, name)
        return {
          id: makeId(path),
          name,
          path,
          lastActive: getLastActive(path),
          source: 'scan'
        }
      })
  } catch {
    return []
  }
}

export function buildProjectList(config) {
  const seen = new Set()
  const all = []
  for (const dir of (config.scanDirs || [])) {
    for (const p of scanDir(dir)) {
      if (!seen.has(p.path)) { seen.add(p.path); all.push(p) }
    }
  }
  for (const path of (config.manualProjects || [])) {
    const id = makeId(path)
    if (!seen.has(path) && existsSync(join(path, '.claude'))) {
      seen.add(path)
      all.push({ id, name: basename(path), path, lastActive: getLastActive(path), source: 'manual' })
    }
  }
  return all.sort((a, b) => {
    if (!a.lastActive) return 1
    if (!b.lastActive) return -1
    return new Date(b.lastActive) - new Date(a.lastActive)
  })
}

export function getProjectById(list, id) {
  return list.find(p => p.id === id) || null
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -- --reporter=verbose 2>&1 | head -40
```

期望：PASS，4 tests passed

- [ ] **Step 5: Commit**

```bash
git add server/projects.js server/__tests__/projects.test.js
git commit -m "feat: add project scanning module"
```

---

### Task 4: 会话历史模块

**Files:**
- Create: `server/sessions.js`
- Create: `server/__tests__/sessions.test.js`

- [ ] **Step 1: 写失败测试**

新建 `server/__tests__/sessions.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -- --reporter=verbose 2>&1 | head -40
```

期望：FAIL，`Cannot find module '../sessions.js'`

- [ ] **Step 3: 实现 sessions.js**

新建 `server/sessions.js`：

```js
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'

function parseLines(content) {
  return content.trim().split('\n').flatMap(line => {
    try { return [JSON.parse(line)] } catch { return [] }
  })
}

function extractMessage(obj) {
  const msg = obj.message
  if (!msg) return null
  const content = typeof msg.content === 'string'
    ? msg.content
    : Array.isArray(msg.content)
      ? msg.content.filter(b => b.type === 'text').map(b => b.text).join(' ')
      : ''
  return { role: msg.role, content, timestamp: obj.timestamp, uuid: obj.uuid }
}

export function listSessions(projectPath) {
  const claudeDir = join(projectPath, '.claude')
  if (!existsSync(claudeDir)) return []
  try {
    const files = readdirSync(claudeDir).filter(f => f.endsWith('.jsonl'))
    return files
      .map(f => {
        const id = basename(f, '.jsonl')
        const lines = parseLines(readFileSync(join(claudeDir, f), 'utf8'))
        const messages = lines.map(extractMessage).filter(Boolean)
        const userMsgs = messages.filter(m => m.role === 'user')
        const firstUser = userMsgs[0]
        const title = firstUser ? firstUser.content.slice(0, 50) : '（无内容）'
        const timestamps = messages.map(m => m.timestamp).filter(Boolean).sort()
        return {
          id,
          title,
          messageCount: messages.length,
          createdAt: timestamps[0] || null,
          updatedAt: timestamps[timestamps.length - 1] || null
        }
      })
      .sort((a, b) => {
        if (!a.updatedAt) return 1
        if (!b.updatedAt) return -1
        return new Date(b.updatedAt) - new Date(a.updatedAt)
      })
  } catch {
    return []
  }
}

export function getSession(projectPath, sessionId) {
  const filePath = join(projectPath, '.claude', `${sessionId}.jsonl`)
  if (!existsSync(filePath)) return []
  const lines = parseLines(readFileSync(filePath, 'utf8'))
  return lines.map(extractMessage).filter(Boolean)
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -- --reporter=verbose 2>&1 | head -40
```

期望：PASS，3 tests passed

- [ ] **Step 5: Commit**

```bash
git add server/sessions.js server/__tests__/sessions.test.js
git commit -m "feat: add session history module"
```

---

### Task 5: Git 记录模块

**Files:**
- Create: `server/git.js`
- Create: `server/__tests__/git.test.js`

- [ ] **Step 1: 写失败测试**

新建 `server/__tests__/git.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npm test -- --reporter=verbose 2>&1 | head -40
```

期望：FAIL，`Cannot find module '../git.js'`

- [ ] **Step 3: 实现 git.js**

新建 `server/git.js`：

```js
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

export function getGitLog(projectPath, limit = 50) {
  if (!existsSync(join(projectPath, '.git'))) return []
  try {
    const out = execSync(
      `git log --pretty=format:"%h|||%s|||%an|||%ar" -${limit}`,
      { cwd: projectPath, encoding: 'utf8', timeout: 5000 }
    )
    return out.trim().split('\n').filter(Boolean).map(line => {
      const [hash, message, author, relativeTime] = line.split('|||')
      return { hash, message, author, relativeTime }
    })
  } catch {
    return []
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npm test -- --reporter=verbose 2>&1 | head -40
```

期望：PASS，2 tests passed

- [ ] **Step 5: Commit**

```bash
git add server/git.js server/__tests__/git.test.js
git commit -m "feat: add git log module"
```

---

### Task 6: Express API 服务

**Files:**
- Create: `server/index.js`

- [ ] **Step 1: 创建 server/index.js**

```js
import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { loadConfig, saveConfig } from './config.js'
import { buildProjectList, getProjectById } from './projects.js'
import { listSessions, getSession } from './sessions.js'
import { getGitLog } from './git.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json())

const PUBLIC_DIR = join(__dirname, 'public')

// --- Projects ---
app.get('/api/projects', (req, res) => {
  const cfg = loadConfig()
  res.json(buildProjectList(cfg))
})

app.post('/api/projects', (req, res) => {
  const { path } = req.body
  if (!path || !existsSync(path)) return res.status(400).json({ error: 'Invalid path' })
  const cfg = loadConfig()
  if (!cfg.manualProjects.includes(path)) {
    cfg.manualProjects.push(path)
    saveConfig(cfg)
  }
  res.json({ ok: true })
})

app.delete('/api/projects/:id', (req, res) => {
  const cfg = loadConfig()
  const list = buildProjectList(cfg)
  const proj = getProjectById(list, req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  cfg.manualProjects = cfg.manualProjects.filter(p => p !== proj.path)
  cfg.scanDirs = cfg.scanDirs.filter(d => !proj.path.startsWith(d))
  saveConfig(cfg)
  res.json({ ok: true })
})

app.get('/api/projects/:id', (req, res) => {
  const cfg = loadConfig()
  const list = buildProjectList(cfg)
  const proj = getProjectById(list, req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  res.json(proj)
})

// --- Sessions ---
app.get('/api/projects/:id/sessions', (req, res) => {
  const cfg = loadConfig()
  const proj = getProjectById(buildProjectList(cfg), req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  res.json(listSessions(proj.path))
})

app.get('/api/projects/:id/sessions/:sid', (req, res) => {
  const cfg = loadConfig()
  const proj = getProjectById(buildProjectList(cfg), req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  res.json(getSession(proj.path, req.params.sid))
})

// --- Git ---
app.get('/api/projects/:id/git', (req, res) => {
  const cfg = loadConfig()
  const proj = getProjectById(buildProjectList(cfg), req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  res.json(getGitLog(proj.path))
})

// --- Config ---
app.get('/api/config', (req, res) => res.json(loadConfig()))

app.put('/api/config', (req, res) => {
  const { scanDirs, manualProjects } = req.body
  if (!Array.isArray(scanDirs) || !Array.isArray(manualProjects)) {
    return res.status(400).json({ error: 'Invalid config' })
  }
  saveConfig({ scanDirs, manualProjects })
  res.json({ ok: true })
})

// --- Static (production) ---
if (existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR))
  app.get('*', (req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')))
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  if (existsSync(PUBLIC_DIR) && process.env.NODE_ENV !== 'test') {
    import('open').then(m => m.default(`http://localhost:${PORT}`))
  }
})

export default app
```

- [ ] **Step 2: 手动验证服务启动**

```bash
node server/index.js &
sleep 1
curl -s http://localhost:3000/api/projects | head -c 200
kill %1
```

期望：返回 JSON 数组（可能为空 `[]`）

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat: add Express API server"
```

---

### Task 7: React 前端基础框架

**Files:**
- Create: `client/index.html`
- Create: `client/main.jsx`
- Create: `client/App.jsx`
- Create: `client/components/Sidebar.jsx`
- Create: `client/components/ProjectDetail.jsx`

- [ ] **Step 1: 创建 client/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claude Code 项目管理器</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        color-scheme: light dark;
        --bg: #ffffff; --bg2: #f6f8fa; --bg3: #eaeef2;
        --border: #d0d7de; --text: #1f2328; --text2: #57606a;
        --accent: #0969da; --accent-bg: #dbeafe;
        --green: #1a7f37; --red: #cf222e;
        --font: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #0d1117; --bg2: #161b22; --bg3: #21262d;
          --border: #30363d; --text: #e6edf3; --text2: #8b949e;
          --accent: #58a6ff; --accent-bg: #1f3a5f;
          --green: #3fb950; --red: #f85149;
        }
      }
      body { font-family: var(--font); background: var(--bg); color: var(--text); height: 100vh; overflow: hidden; }
      #root { height: 100vh; display: flex; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/client/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: 创建 client/main.jsx**

```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
```

- [ ] **Step 3: 创建 client/App.jsx**

```jsx
import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import ProjectDetail from './components/ProjectDetail.jsx'
import OnboardingModal from './components/OnboardingModal.jsx'

export default function App() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  async function fetchProjects() {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(data)
    setLoading(false)
    if (data.length === 0) setShowOnboarding(true)
  }

  useEffect(() => { fetchProjects() }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: 'var(--text2)' }}>
      加载中...
    </div>
  )

  return (
    <>
      {showOnboarding && (
        <OnboardingModal onClose={() => { setShowOnboarding(false); fetchProjects() }} />
      )}
      <Sidebar projects={projects} />
      <Routes>
        <Route path="/projects/:id/*" element={<ProjectDetail projects={projects} />} />
        <Route path="/" element={
          projects.length > 0
            ? <Navigate to={`/projects/${projects[0].id}`} replace />
            : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
                暂无项目，请添加扫描目录
              </div>
        } />
      </Routes>
    </>
  )
}
```

- [ ] **Step 4: 创建 client/components/Sidebar.jsx**

```jsx
import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const S = {
  sidebar: { width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' },
  header: { padding: '14px 12px 8px', borderBottom: '1px solid var(--border)' },
  title: { fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  list: { flex: 1, overflowY: 'auto', padding: '6px 0' },
  item: { display: 'block', padding: '7px 12px', fontSize: 13, color: 'var(--text)', textDecoration: 'none', borderLeft: '2px solid transparent', cursor: 'pointer' },
  itemActive: { background: 'var(--bg3)', borderLeftColor: 'var(--accent)', color: 'var(--accent)' },
  dot: { display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 6 },
  footer: { padding: '10px 12px', borderTop: '1px solid var(--border)', fontSize: 12 },
  addBtn: { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, padding: 0 }
}

function relativeTime(iso) {
  if (!iso) return '从未'
  const diff = Date.now() - new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

export default function Sidebar({ projects }) {
  const navigate = useNavigate()

  async function handleAddProject() {
    const path = window.prompt('输入项目路径：')
    if (!path) return
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    })
    if (res.ok) window.location.reload()
    else alert('添加失败，请检查路径是否存在')
  }

  return (
    <div style={S.sidebar}>
      <div style={S.header}>
        <div style={S.title}>项目</div>
      </div>
      <div style={S.list}>
        {projects.map(p => (
          <NavLink
            key={p.id}
            to={`/projects/${p.id}`}
            style={({ isActive }) => ({ ...S.item, ...(isActive ? S.itemActive : {}) })}
          >
            <span style={{ ...S.dot, background: p.lastActive ? 'var(--green)' : 'var(--text2)' }} />
            <span style={{ fontWeight: 500 }}>{p.name}</span>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 12, marginTop: 2 }}>
              {relativeTime(p.lastActive)}
            </div>
          </NavLink>
        ))}
      </div>
      <div style={S.footer}>
        <button style={S.addBtn} onClick={handleAddProject}>+ 手动添加项目</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 创建 client/components/ProjectDetail.jsx**

```jsx
import React from 'react'
import { useParams, NavLink, Routes, Route, Navigate } from 'react-router-dom'
import OverviewTab from './OverviewTab.jsx'
import SessionList from './SessionList.jsx'
import GitLog from './GitLog.jsx'

const S = {
  container: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: 600 },
  tabs: { display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px' },
  tab: { padding: '8px 14px', fontSize: 13, color: 'var(--text2)', textDecoration: 'none', borderBottom: '2px solid transparent', marginBottom: -1 },
  tabActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  content: { flex: 1, overflow: 'auto', padding: 16 }
}

export default function ProjectDetail({ projects }) {
  const { id } = useParams()
  const project = projects.find(p => p.id === id)

  if (!project) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
      项目未找到
    </div>
  )

  const tabs = [
    { label: '概览', path: '' },
    { label: '会话历史', path: 'sessions' },
    { label: 'Git 记录', path: 'git' },
  ]

  return (
    <div style={S.container}>
      <div style={S.header}>
        <span style={S.name}>{project.name}</span>
      </div>
      <div style={S.tabs}>
        {tabs.map(t => (
          <NavLink
            key={t.label}
            to={t.path === '' ? `/projects/${id}` : `/projects/${id}/${t.path}`}
            end={t.path === ''}
            style={({ isActive }) => ({ ...S.tab, ...(isActive ? S.tabActive : {}) })}
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <div style={S.content}>
        <Routes>
          <Route index element={<OverviewTab project={project} />} />
          <Route path="sessions" element={<SessionList project={project} />} />
          <Route path="git" element={<GitLog project={project} />} />
        </Routes>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add client/
git commit -m "feat: add React frontend framework with sidebar and project detail"
```

---

### Task 8: 概览 Tab 组件

**Files:**
- Create: `client/components/OverviewTab.jsx`

- [ ] **Step 1: 创建 client/components/OverviewTab.jsx**

```jsx
import React from 'react'

const S = {
  card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px', marginBottom: 12 },
  label: { fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  value: { fontSize: 13, color: 'var(--text)', wordBreak: 'break-all' },
  row: { display: 'flex', gap: 8, marginTop: 12 },
  btn: { padding: '6px 14px', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg2)', color: 'var(--text)' },
  btnPrimary: { background: 'var(--accent)', color: '#fff', border: 'none' }
}

function relativeTime(iso) {
  if (!iso) return '从未'
  const diff = Date.now() - new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

export default function OverviewTab({ project }) {
  function openInTerminal() {
    fetch('/api/open-terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: project.path })
    })
  }

  function copyPath() {
    navigator.clipboard.writeText(project.path)
      .then(() => alert('路径已复制'))
  }

  return (
    <div>
      <div style={S.card}>
        <div style={S.label}>项目路径</div>
        <div style={S.value}>{project.path}</div>
      </div>
      <div style={S.card}>
        <div style={S.label}>最后活动</div>
        <div style={S.value}>{relativeTime(project.lastActive)}</div>
      </div>
      <div style={S.row}>
        <button style={{ ...S.btn, ...S.btnPrimary }} onClick={openInTerminal}>在终端中打开</button>
        <button style={S.btn} onClick={copyPath}>复制路径</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 在 server/index.js 中添加 open-terminal 端点**

在 `server/index.js` 的 `// --- Static` 注释之前添加：

```js
// --- Terminal ---
app.post('/api/open-terminal', (req, res) => {
  const { path } = req.body
  if (!path || !existsSync(path)) return res.status(400).json({ error: 'Invalid path' })
  import('child_process').then(({ execSync }) => {
    try {
      execSync(`open -a Terminal "${path}"`)
      res.json({ ok: true })
    } catch {
      res.status(500).json({ error: 'Failed to open terminal' })
    }
  })
})
```

- [ ] **Step 3: Commit**

```bash
git add client/components/OverviewTab.jsx server/index.js
git commit -m "feat: add overview tab with terminal open and copy path"
```

---

### Task 9: 会话历史 Tab 组件

**Files:**
- Create: `client/components/SessionList.jsx`

- [ ] **Step 1: 创建 client/components/SessionList.jsx**

```jsx
import React, { useEffect, useState } from 'react'

const S = {
  empty: { color: 'var(--text2)', fontSize: 13, padding: '20px 0' },
  item: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 8, overflow: 'hidden' },
  itemHeader: { padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 13, fontWeight: 500, color: 'var(--text)', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { fontSize: 11, color: 'var(--text2)', flexShrink: 0 },
  messages: { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  bubble: { maxWidth: '80%', padding: '8px 12px', borderRadius: 8, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  userBubble: { background: 'var(--accent-bg)', color: 'var(--text)', alignSelf: 'flex-end' },
  assistantBubble: { background: 'var(--bg3)', color: 'var(--text)', alignSelf: 'flex-start' }
}

function relativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso)
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '刚刚'
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

function SessionItem({ session, projectId }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (!open && messages.length === 0) {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/sessions/${session.id}`)
      setMessages(await res.json())
      setLoading(false)
    }
    setOpen(o => !o)
  }

  return (
    <div style={S.item}>
      <div style={S.itemHeader} onClick={toggle}>
        <span style={S.title}>{session.title}</span>
        <span style={S.meta}>{session.messageCount} 条 · {relativeTime(session.updatedAt)}</span>
        <span style={{ marginLeft: 8, color: 'var(--text2)', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={S.messages}>
          {loading && <div style={{ color: 'var(--text2)', fontSize: 12 }}>加载中...</div>}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...S.bubble, ...(m.role === 'user' ? S.userBubble : S.assistantBubble) }}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SessionList({ project }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${project.id}/sessions`)
      .then(r => r.json())
      .then(data => { setSessions(data); setLoading(false) })
  }, [project.id])

  if (loading) return <div style={S.empty}>加载中...</div>
  if (sessions.length === 0) return <div style={S.empty}>暂无会话记录</div>

  return (
    <div>
      {sessions.map(s => (
        <SessionItem key={s.id} session={s} projectId={project.id} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/components/SessionList.jsx
git commit -m "feat: add session history tab with expandable messages"
```

---

### Task 10: Git 记录 Tab 组件

**Files:**
- Create: `client/components/GitLog.jsx`

- [ ] **Step 1: 创建 client/components/GitLog.jsx**

```jsx
import React, { useEffect, useState } from 'react'

const S = {
  empty: { color: 'var(--text2)', fontSize: 13, padding: '20px 0' },
  item: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 },
  hash: { fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)', flexShrink: 0, width: 56 },
  message: { flex: 1, color: 'var(--text)' },
  meta: { fontSize: 11, color: 'var(--text2)', flexShrink: 0 }
}

export default function GitLog({ project }) {
  const [commits, setCommits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${project.id}/git`)
      .then(r => r.json())
      .then(data => { setCommits(data); setLoading(false) })
  }, [project.id])

  if (loading) return <div style={S.empty}>加载中...</div>
  if (commits.length === 0) return <div style={S.empty}>此项目未初始化 git 仓库或暂无提交记录</div>

  return (
    <div>
      {commits.map((c, i) => (
        <div key={i} style={S.item}>
          <span style={S.hash}>{c.hash}</span>
          <span style={S.message}>{c.message}</span>
          <span style={S.meta}>{c.author} · {c.relativeTime}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/components/GitLog.jsx
git commit -m "feat: add git log tab"
```

---

### Task 11: 首次使用引导弹窗

**Files:**
- Create: `client/components/OnboardingModal.jsx`

- [ ] **Step 1: 创建 client/components/OnboardingModal.jsx**

```jsx
import React, { useState } from 'react'

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, width: 440, maxWidth: '90vw' },
  title: { fontSize: 16, fontWeight: 600, marginBottom: 8 },
  desc: { fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 },
  input: { width: '100%', padding: '8px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', marginBottom: 8 },
  row: { display: 'flex', gap: 8, marginTop: 8 },
  btn: { flex: 1, padding: '8px 0', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg2)', color: 'var(--text)' },
  btnPrimary: { background: 'var(--accent)', color: '#fff', border: 'none' },
  dirs: { marginBottom: 8 },
  dirItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'var(--bg2)', borderRadius: 4, marginBottom: 4, fontSize: 12 },
  removeBtn: { background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12 }
}

export default function OnboardingModal({ onClose }) {
  const [dirs, setDirs] = useState([])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  function addDir() {
    const d = input.trim()
    if (d && !dirs.includes(d)) setDirs(prev => [...prev, d])
    setInput('')
  }

  async function save() {
    if (dirs.length === 0) return alert('请至少添加一个扫描目录')
    setSaving(true)
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanDirs: dirs, manualProjects: [] })
    })
    setSaving(false)
    onClose()
  }

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.title}>欢迎使用 Claude Code 项目管理器</div>
        <div style={S.desc}>请添加要扫描的目录。工具会自动发现其中包含 .claude/ 文件夹的项目。</div>
        <div style={S.dirs}>
          {dirs.map(d => (
            <div key={d} style={S.dirItem}>
              <span>{d}</span>
              <button style={S.removeBtn} onClick={() => setDirs(prev => prev.filter(x => x !== d))}>移除</button>
            </div>
          ))}
        </div>
        <input
          style={S.input}
          placeholder="输入目录路径，如 /Users/yourname/Projects"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addDir()}
        />
        <button style={{ ...S.btn, marginBottom: 8 }} onClick={addDir}>+ 添加目录</button>
        <div style={S.row}>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={save} disabled={saving}>
            {saving ? '保存中...' : '开始使用'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/components/OnboardingModal.jsx
git commit -m "feat: add onboarding modal for first-time setup"
```

---

### Task 12: 端到端验证

**Files:** 无新文件

- [ ] **Step 1: 运行全部测试**

```bash
npm test
```

期望：所有测试通过，无失败。

- [ ] **Step 2: 开发模式验证**

```bash
npm run dev
```

浏览器打开 `http://localhost:5173`，验证：
1. 首次启动显示引导弹窗
2. 输入 `~/.claude/projects` 的父目录，点击"开始使用"
3. 左侧边栏出现项目列表
4. 点击项目，右侧显示概览 Tab
5. 切换"会话历史"Tab，显示会话列表，点击展开查看消息
6. 切换"Git 记录"Tab，显示提交历史

- [ ] **Step 3: 生产模式验证**

```bash
npm start
```

期望：浏览器自动打开 `http://localhost:3000`，功能与开发模式一致。

- [ ] **Step 4: 最终 Commit**

```bash
git add -A
git commit -m "chore: verify end-to-end functionality"
```

