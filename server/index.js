import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, readdirSync, readFileSync, copyFileSync, mkdirSync, statSync } from 'fs'
import os from 'os'
import { loadConfig, saveConfig } from './config.js'
import { buildProjectList, getProjectById } from './projects.js'
import { listSessions, getSession } from './sessions.js'
import { getGitLog } from './git.js'
import { listMemories, getMemory, saveMemory, deleteMemory, listGlobalMemories, getGlobalMemory, saveGlobalMemory, deleteGlobalMemory } from './memories.js'
import { listGlobalMcpServers, listProjectMcpServers, saveGlobalMcpServer, saveProjectMcpServer, deleteGlobalMcpServer, deleteProjectMcpServer } from './mcp.js'
import { searchSessions, searchAllSessions } from './search.js'
import { readPrompt, writePrompt } from './prompts.js'
import { readToolPerms, writeToolPerms } from './toolperms.js'
import { listCommands, saveCommand, deleteCommand } from './commands.js'

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
  const { path, mode } = req.body  // mode: 'project' | 'scandir' | undefined=auto
  if (!path || !existsSync(path)) return res.status(400).json({ error: 'Invalid path' })
  const cfg = loadConfig()
  // 自动判断：该路径本身有 Claude 会话则为项目，否则为扫描目录
  const encoded = path.replace(/\//g, '-')
  const claudeDir = join(os.homedir(), '.claude', 'projects', encoded)
  const isSingleProject = mode === 'project' || (mode !== 'scandir' && existsSync(claudeDir))
  if (isSingleProject) {
    if (!cfg.manualProjects.includes(path)) { cfg.manualProjects.push(path); saveConfig(cfg) }
    res.json({ ok: true, type: 'project' })
  } else {
    if (!cfg.scanDirs.includes(path)) { cfg.scanDirs.push(path); saveConfig(cfg) }
    res.json({ ok: true, type: 'scandir' })
  }
})

app.delete('/api/projects/:id', (req, res) => {
  const cfg = loadConfig()
  const list = buildProjectList(cfg)
  const proj = getProjectById(list, req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  // 从手动列表移除；自动发现的项目加入隐藏列表
  cfg.manualProjects = (cfg.manualProjects || []).filter(p => p !== proj.path)
  if (!cfg.hiddenProjects) cfg.hiddenProjects = []
  if (!cfg.hiddenProjects.includes(proj.path)) cfg.hiddenProjects.push(proj.path)
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

// --- Project order ---
app.put('/api/projects/order', (req, res) => {
  const { order } = req.body  // array of paths
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be array' })
  const cfg = loadConfig()
  cfg.projectOrder = order
  saveConfig(cfg)
  res.json({ ok: true })
})

// --- Prompts (CLAUDE.md) ---
app.get('/api/prompts', (req, res) => {
  const { scope, projectId } = req.query
  let projectPath = null
  if (projectId) {
    const cfg = loadConfig()
    const proj = getProjectById(buildProjectList(cfg), projectId)
    if (!proj) return res.status(404).json({ error: 'Not found' })
    projectPath = proj.path
  }
  res.json(readPrompt(scope || 'global', projectPath))
})

app.put('/api/prompts', (req, res) => {
  const { scope, projectId, content } = req.body
  let projectPath = null
  if (projectId) {
    const cfg = loadConfig()
    const proj = getProjectById(buildProjectList(cfg), projectId)
    if (!proj) return res.status(404).json({ error: 'Not found' })
    projectPath = proj.path
  }
  const path = writePrompt(scope || 'global', projectPath, content || '')
  res.json({ ok: true, path })
})

// --- Tool Permissions ---
app.get('/api/projects/:id/toolperms', (req, res) => {
  const cfg = loadConfig()
  const proj = getProjectById(buildProjectList(cfg), req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  res.json(readToolPerms(proj.path))
})

app.put('/api/projects/:id/toolperms', (req, res) => {
  const cfg = loadConfig()
  const proj = getProjectById(buildProjectList(cfg), req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  const { allow, deny } = req.body
  writeToolPerms(proj.path, { allow: allow || [], deny: deny || [] })
  res.json({ ok: true })
})

// --- Slash Commands ---
app.get('/api/commands', (req, res) => {
  const { projectId } = req.query
  let projectPath = null
  if (projectId) {
    const cfg = loadConfig()
    const proj = getProjectById(buildProjectList(cfg), projectId)
    if (proj) projectPath = proj.path
  }
  res.json(listCommands(projectPath))
})

app.post('/api/commands', (req, res) => {
  const { scope, projectId, name, description, content } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  let projectPath = null
  if (projectId) {
    const cfg = loadConfig()
    const proj = getProjectById(buildProjectList(cfg), projectId)
    if (proj) projectPath = proj.path
  }
  const file = saveCommand(scope || 'global', projectPath, null, { name, description: description || '', content: content || '' })
  res.json({ ok: true, file })
})

app.put('/api/commands/:file', (req, res) => {
  const { scope, projectId, name, description, content } = req.body
  let projectPath = null
  if (projectId) {
    const cfg = loadConfig()
    const proj = getProjectById(buildProjectList(cfg), projectId)
    if (proj) projectPath = proj.path
  }
  saveCommand(scope || 'global', projectPath, req.params.file, { name: name || req.params.file, description: description || '', content: content || '' })
  res.json({ ok: true })
})

app.delete('/api/commands/:file', (req, res) => {
  const { scope, projectId } = req.query
  let projectPath = null
  if (projectId) {
    const cfg = loadConfig()
    const proj = getProjectById(buildProjectList(cfg), projectId)
    if (proj) projectPath = proj.path
  }
  deleteCommand(scope || 'global', projectPath, req.params.file)
  res.json({ ok: true })
})

// --- MCP Servers ---
app.get('/api/mcp', (req, res) => {
  const { projectId } = req.query
  const global = listGlobalMcpServers()
  let project = []
  if (projectId) {
    const cfg = loadConfig()
    const proj = getProjectById(buildProjectList(cfg), projectId)
    if (proj) project = listProjectMcpServers(proj.path)
  }
  res.json({ global, project })
})

app.post('/api/mcp', (req, res) => {
  const { scope, projectId, name, command, args, env, url } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const config = {}
  if (url) { config.url = url }
  else { config.command = command || ''; config.args = args || [] }
  if (env && Object.keys(env).length > 0) config.env = env
  if (scope === 'project' && projectId) {
    const cfg = loadConfig()
    const proj = getProjectById(buildProjectList(cfg), projectId)
    if (!proj) return res.status(404).json({ error: 'Project not found' })
    saveProjectMcpServer(proj.path, name, config)
  } else {
    saveGlobalMcpServer(name, config)
  }
  res.json({ ok: true })
})

app.put('/api/mcp/:name', (req, res) => {
  const { scope, projectId, command, args, env, url } = req.body
  const config = {}
  if (url) { config.url = url }
  else { config.command = command || ''; config.args = args || [] }
  if (env && Object.keys(env).length > 0) config.env = env
  if (scope === 'project' && projectId) {
    const cfg = loadConfig()
    const proj = getProjectById(buildProjectList(cfg), projectId)
    if (!proj) return res.status(404).json({ error: 'Project not found' })
    saveProjectMcpServer(proj.path, req.params.name, config)
  } else {
    saveGlobalMcpServer(req.params.name, config)
  }
  res.json({ ok: true })
})

app.delete('/api/mcp/:name', (req, res) => {
  const { scope, projectId } = req.query
  if (scope === 'project' && projectId) {
    const cfg = loadConfig()
    const proj = getProjectById(buildProjectList(cfg), projectId)
    if (!proj) return res.status(404).json({ error: 'Project not found' })
    deleteProjectMcpServer(proj.path, req.params.name)
  } else {
    deleteGlobalMcpServer(req.params.name)
  }
  res.json({ ok: true })
})

// --- Session Search ---
app.get('/api/projects/:id/search', (req, res) => {
  const { q } = req.query
  if (!q) return res.json([])
  const cfg = loadConfig()
  const proj = getProjectById(buildProjectList(cfg), req.params.id)
  if (!proj) return res.status(404).json({ error: 'Not found' })
  res.json(searchSessions(proj.path, q))
})

// 全局跨项目搜索
app.get('/api/search', (req, res) => {
  const { q } = req.query
  if (!q) return res.json([])
  const cfg = loadConfig()
  const projects = buildProjectList(cfg)
  res.json(searchAllSessions(projects, q))
})

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
  const result = [
    { id: '__global__', name: '全局记忆', memories: listGlobalMemories() },
    ...projects
      .map(p => ({ id: p.id, name: p.name, memories: listMemories(p.path) }))
      .filter(p => p.memories.length > 0)
  ]
  res.json(result)
})

// --- 全局记忆 CRUD ---
app.get('/api/global-memories', (req, res) => {
  res.json(listGlobalMemories())
})

app.post('/api/global-memories', (req, res) => {
  const { name, type, description, content } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const file = saveGlobalMemory(null, { name, type: type || 'user', description: description || '', content: content || '' })
  res.json({ ok: true, file })
})

app.put('/api/global-memories/:file', (req, res) => {
  const { name, type, description, content } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  saveGlobalMemory(req.params.file, { name, type: type || 'user', description: description || '', content: content || '' })
  res.json({ ok: true })
})

app.delete('/api/global-memories/:file', (req, res) => {
  deleteGlobalMemory(req.params.file)
  res.json({ ok: true })
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

// --- Launch Claude ---
app.post('/api/launch-claude', (req, res) => {
  const { path } = req.body
  if (!path || !existsSync(path)) return res.status(400).json({ error: 'Invalid path' })
  import('child_process').then(({ spawn }) => {
    try {
      // 用 open -a Terminal 打开新终端窗口并在项目目录执行 claude
      spawn('osascript', [
        '-e', `tell application "Terminal"`,
        '-e', `do script "cd \\"${path}\\" && claude"`,
        '-e', `activate`,
        '-e', `end tell`
      ], { detached: true, stdio: 'ignore' }).unref()
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })
})

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

// --- Usage ---
const usageCache = new Map()

// 定价（USD per token），claude-opus-4-6
const MODEL_PRICES = {
  'claude-opus-4-6':   { input: 15 / 1e6,  output: 75 / 1e6 },
  'claude-opus-4':     { input: 15 / 1e6,  output: 75 / 1e6 },
  'claude-sonnet-4-6': { input: 3 / 1e6,   output: 15 / 1e6 },
  'claude-sonnet-4':   { input: 3 / 1e6,   output: 15 / 1e6 },
  'claude-haiku-4-5':  { input: 0.8 / 1e6, output: 4 / 1e6 },
  'default':           { input: 15 / 1e6,  output: 75 / 1e6 }
}

function calcCost(model, input, output) {
  const p = MODEL_PRICES[model] || MODEL_PRICES.default
  return input * p.input + output * p.output
}

// 解析一个 claude 目录下的所有会话，返回带时间戳的用量记录
function parseUsageRecords(claudeDir, since, until) {
  const records = []  // { date, model, input, output, cacheRead, cacheCreate }
  if (!existsSync(claudeDir)) return records
  try {
    for (const f of readdirSync(claudeDir).filter(f => f.endsWith('.jsonl'))) {
      const filePath = join(claudeDir, f)
      let fileRecords
      try {
        const mtime = statSync(filePath).mtimeMs
        const cacheKey = `${filePath}:${mtime}`
        if (usageCache.has(cacheKey)) {
          fileRecords = usageCache.get(cacheKey)
        } else {
          fileRecords = []
          for (const line of readFileSync(filePath, 'utf8').trim().split('\n')) {
            try {
              const obj = JSON.parse(line)
              const msg = obj.message || {}
              const model = msg.model
              const usage = msg.usage
              const ts = obj.timestamp
              if (!model || !usage || !ts) continue
              if (model === '<synthetic>') continue
              // date 用本地时间（ts 是 UTC，转本地日期用于 day 粒度分组）
              const _localD = new Date(ts)
              const _p = n => String(n).padStart(2, '0')
              const date = `${_localD.getFullYear()}-${_p(_localD.getMonth()+1)}-${_p(_localD.getDate())}`
              fileRecords.push({
                date, ts, model,
                input: usage.input_tokens || 0,
                output: usage.output_tokens || 0,
                cacheRead: usage.cache_read_input_tokens || 0,
                cacheCreate: usage.cache_creation_input_tokens || 0
              })
            } catch (e) { console.error('[warn]', e.message) }
          }
          usageCache.set(cacheKey, fileRecords)
        }
      } catch (e) { console.error('[warn]', e.message); fileRecords = [] }
      // Apply since/until filter after cache lookup
      // since/until 来自前端本地时间（如 2026-04-12T18:00），ts 是 UTC ISO（如 2026-04-12T10:00:00.000Z）
      // 统一转成 Date 对象再比较，避免时区偏差
      for (const r of fileRecords) {
        if (since && new Date(r.ts) < new Date(since)) continue
        if (until && new Date(r.ts) > new Date(until)) continue
        records.push(r)
      }
    }
  } catch (e) { console.error('[warn]', e.message) }
  return records
}

function aggregateRecords(records, granularity = 'day', minuteStep = 1) {
  const byModel = {}, bySlot = {}
  for (const r of records) {
    if (!byModel[r.model]) byModel[r.model] = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0, cost: 0 }
    byModel[r.model].input += r.input
    byModel[r.model].output += r.output
    byModel[r.model].cacheRead += r.cacheRead
    byModel[r.model].cacheCreate += r.cacheCreate
    byModel[r.model].cost += calcCost(r.model, r.input, r.output)
    // 时间槽：用本地时间（ts 是 UTC，转成本地再取 slot key）
    const localDate = new Date(r.ts)
    const pad2 = n => String(n).padStart(2, '0')
    const ymd = `${localDate.getFullYear()}-${pad2(localDate.getMonth()+1)}-${pad2(localDate.getDate())}`
    const localSlot = granularity === 'minute'
      ? `${ymd}T${pad2(localDate.getHours())}:${pad2(Math.floor(localDate.getMinutes() / minuteStep) * minuteStep)}`
      : granularity === 'hour'
        ? `${ymd}T${pad2(localDate.getHours())}`
        : ymd
    const slot = localSlot
    if (!bySlot[slot]) bySlot[slot] = {}
    if (!bySlot[slot][r.model]) bySlot[slot][r.model] = { input: 0, output: 0 }
    bySlot[slot][r.model].input += r.input
    bySlot[slot][r.model].output += r.output
  }
  return { byModel, bySlot }
}

import { getClaudeProjectDir } from './sessions.js'

app.get('/api/usage', (req, res) => {
  const { since, until, projectId } = req.query
  const cfg = loadConfig()
  const projects = buildProjectList(cfg)
  const allRecords = []
  const byProject = []

  for (const p of projects) {
    if (projectId && p.id !== projectId) continue
    const claudeDir = getClaudeProjectDir(p.path)
    const records = parseUsageRecords(claudeDir, since, until)
    allRecords.push(...records)
    const { byModel: pm } = aggregateRecords(records)
    const projInput = Object.values(pm).reduce((s, m) => s + m.input, 0)
    const projOutput = Object.values(pm).reduce((s, m) => s + m.output, 0)
    const projCost = Object.values(pm).reduce((s, m) => s + m.cost, 0)
    if (projInput + projOutput > 0) {
      byProject.push({
        id: p.id, name: p.name,
        inputTokens: projInput, outputTokens: projOutput, cost: projCost,
        byModel: Object.entries(pm).map(([model, u]) => ({ model, ...u }))
      })
    }
  }

  byProject.sort((a, b) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens))

  // 根据时间范围自动选粒度
  const sinceMs = since ? new Date(since).getTime() : null
  const untilMs = until ? new Date(until).getTime() : null
  const rangeMs = (sinceMs && untilMs) ? untilMs - sinceMs : null
  const granularity = rangeMs !== null && rangeMs <= 3 * 24 * 3600 * 1000 ? 'minute'
    : rangeMs !== null && rangeMs <= 7 * 24 * 3600 * 1000 ? 'hour'
    : 'day'

  // 分钟粒度时的步长（控制最大点数 ≤ 300）
  // 1h=60点 → step=1，6h=360点 → step=2(5min)，24h=1440点 → step=5(5min)，3d=4320点 → step=15(15min)
  const minuteStep = granularity === 'minute' && rangeMs
    ? Math.max(1, Math.ceil(rangeMs / 60000 / 300))
    : 1

  const { byModel: globalByModel, bySlot } = aggregateRecords(allRecords, granularity, minuteStep)

  // 填充连续时间序列（即使无数据也生成完整序列）
  const timeSeries = []
  const pad2 = n => String(n).padStart(2, '0')
  // 确定起止范围（since/until 是本地时间字符串，直接解析为本地 Date）
  function parseLocalDT(s) {
    if (!s) return null
    // 支持 "2026-04-11"、"2026-04-11T14"、"2026-04-11T14:30" 格式
    if (s.length === 10) return new Date(s + 'T00:00:00')
    if (s.length === 13) return new Date(s + ':00:00')
    return new Date(s + ':00')
  }
  let cur = parseLocalDT(since) || new Date()
  const endDate = parseLocalDT(until) || new Date()

  // 对齐 cur 到槽边界
  if (granularity === 'minute') {
    cur.setSeconds(0, 0)
    // 对齐到 minuteStep 的整数倍
    cur.setMinutes(Math.floor(cur.getMinutes() / minuteStep) * minuteStep, 0, 0)
  } else if (granularity === 'hour') {
    cur.setMinutes(0, 0, 0)
  } else {
    cur.setHours(0, 0, 0, 0)
  }

  while (cur <= endDate) {
    const y = cur.getFullYear(), mo = cur.getMonth() + 1, d = cur.getDate()
    const h = cur.getHours(), m = cur.getMinutes()
    const ymd = `${y}-${pad2(mo)}-${pad2(d)}`
    const slot = granularity === 'minute'
      ? `${ymd}T${pad2(h)}:${pad2(m)}`
      : granularity === 'hour'
        ? `${ymd}T${pad2(h)}`
        : ymd
    // 可读标签：分钟显示 "HH:MM"，小时显示 "MM-DD HH:00"，天显示 "MM-DD"
    const label = granularity === 'minute'
      ? `${pad2(h)}:${pad2(m)}`
      : granularity === 'hour'
        ? `${pad2(mo)}-${pad2(d)} ${pad2(h)}:00`
        : `${pad2(mo)}-${pad2(d)}`
    timeSeries.push({ date: label, slot, byModel: bySlot[slot] || {} })
    if (granularity === 'minute') cur.setMinutes(cur.getMinutes() + minuteStep)
    else if (granularity === 'hour') cur.setHours(cur.getHours() + 1)
    else cur.setDate(cur.getDate() + 1)
  }

  const totalInput = Object.values(globalByModel).reduce((s, m) => s + m.input, 0)
  const totalOutput = Object.values(globalByModel).reduce((s, m) => s + m.output, 0)
  const totalCost = Object.values(globalByModel).reduce((s, m) => s + m.cost, 0)

  res.json({
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalCostUSD: totalCost,
    byModel: Object.entries(globalByModel).map(([model, u]) => ({ model, ...u }))
      .sort((a, b) => (b.input + b.output) - (a.input + a.output)),
    byProject,
    timeSeries,
    granularity
  })
})

// --- Hooks ---
const HOOK_EVENTS = ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop', 'Notification']

app.get('/api/hooks', (req, res) => {
  const settings = loadSettings()
  const hooks = settings.hooks || {}
  res.json(hooks)
})

app.put('/api/hooks', (req, res) => {
  const { hooks } = req.body
  if (!hooks || typeof hooks !== 'object') return res.status(400).json({ error: 'Invalid hooks' })
  const settings = loadSettings()
  settings.hooks = hooks
  import('fs').then(({ writeFileSync }) => {
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
    res.json({ ok: true })
  })
})

// --- Model Management ---
const SETTINGS_PATH = join(os.homedir(), '.claude', 'settings.json')

function loadSettings() {
  if (!existsSync(SETTINGS_PATH)) return {}
  try { return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8')) } catch { return {} }
}

const AVAILABLE_MODELS = [
  { id: 'claude-opus-4-6',   label: 'Claude Opus 4.6',   desc: '最强能力，适合复杂任务' },
  { id: 'claude-opus-4-6[1m]', label: 'Claude Opus 4.6 (1M)', desc: '超长上下文版本' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', desc: '平衡性能与速度' },
  { id: 'claude-haiku-4-5',  label: 'Claude Haiku 4.5',  desc: '最快速度，适合简单任务' },
]

app.get('/api/models', (req, res) => {
  const settings = loadSettings()
  res.json({ current: settings.model || 'claude-opus-4-6', available: AVAILABLE_MODELS })
})

app.put('/api/models', (req, res) => {
  const { model } = req.body
  const settings = loadSettings()
  if (model) settings.model = model
  else delete settings.model  // 清除默认
  import('fs').then(({ writeFileSync }) => {
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
    res.json({ ok: true, model: model || null })
  })
})

// --- Skills ---
const PLUGINS_DIR = join(os.homedir(), '.claude', 'plugins')
const INSTALLED_PLUGINS_PATH = join(PLUGINS_DIR, 'installed_plugins.json')
const LOCAL_SKILLS_DIR = join(os.homedir(), '.claude', 'skills')

function parseSkillFrontmatter(filePath) {
  try {
    const text = readFileSync(filePath, 'utf8')
    const m = text.match(/^---\n([\s\S]*?)\n---/)
    if (!m) return {}
    const result = {}
    for (const line of m[1].split('\n')) {
      const idx = line.indexOf(':')
      if (idx === -1) continue
      const key = line.slice(0, idx).trim()
      // description 可能是多行 yaml block scalar (|)，取第一行
      let val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '').replace(/^\|$/, '')
      result[key] = val
    }
    return result
  } catch { return {} }
}

// 读取一个 skill 条目（.md 文件或含 SKILL.md 的目录）
function readOneSkill(entryPath, name, pluginId) {
  let fm = {}
  try {
    const s = readFileSync(entryPath, 'utf8') // throws if dir
    if (name.endsWith('.md')) fm = parseSkillFrontmatter(entryPath)
  } catch {
    const skillMd = join(entryPath, 'SKILL.md')
    if (existsSync(skillMd)) fm = parseSkillFrontmatter(skillMd)
  }
  const skillName = name.replace(/\.md$/, '')
  // 跳过非 skill 的目录（如 scripts、docs、tests 等）
  const skip = new Set(['scripts', 'docs', 'tests', 'node_modules', 'lib', 'bin', 'hooks', 'agents', 'contrib', 'setup', 'design', 'extension', 'openclaw', 'hosts', 'supabase'])
  if (skip.has(skillName)) return null
  // 必须有 SKILL.md 或是 .md 文件才算 skill
  const isSkill = name.endsWith('.md') || existsSync(join(entryPath, 'SKILL.md'))
  if (!isSkill) return null
  return {
    id: `${pluginId}:${skillName}`,
    name: skillName,
    description: (fm.description || '').replace(/\n.*/s, '').trim(),  // 只取第一行
    plugin: pluginId
  }
}

function readSkillsFromDir(dir, pluginId) {
  if (!existsSync(dir)) return []
  const skills = []
  try {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.')) continue
      const s = readOneSkill(join(dir, entry), entry, pluginId)
      if (s) skills.push(s)
    }
  } catch {}
  return skills
}

function getAllPlugins(enabledMap) {
  const plugins = []

  // 1. installed_plugins.json（superpowers、minimalist-entrepreneur 等）
  if (existsSync(INSTALLED_PLUGINS_PATH)) {
    try {
      const installed = JSON.parse(readFileSync(INSTALLED_PLUGINS_PATH, 'utf8')).plugins || {}
      for (const [id, versions] of Object.entries(installed)) {
        const latest = Array.isArray(versions) ? versions[versions.length - 1] : versions
        const installPath = latest?.installPath || ''
        const [vendor, name] = id.split('@')
        const skills = readSkillsFromDir(join(installPath, 'skills'), id)
        plugins.push({
          id, name: name || id, vendor: vendor || '',
          version: latest?.version || '',
          source: 'plugin',
          skills, skillCount: skills.length,
          enabled: enabledMap[id] !== false
        })
      }
    } catch {}
  }

  // 2. ~/.claude/skills/ 本地 skill 包（gstack 等）
  if (existsSync(LOCAL_SKILLS_DIR)) {
    try {
      for (const entry of readdirSync(LOCAL_SKILLS_DIR)) {
        if (entry.startsWith('.')) continue
        const entryPath = join(LOCAL_SKILLS_DIR, entry)
        const pluginId = `local:${entry}`
        // 如果是目录且含 SKILL.md，说明它本身是一个 skill
        const selfSkillMd = join(entryPath, 'SKILL.md')
        let skills = []
        let description = ''
        try {
          readFileSync(entryPath) // throws if dir
          // 是 .md 文件，本身就是一个 skill
          const fm = parseSkillFrontmatter(entryPath)
          description = (fm.description || '').replace(/\n.*/s, '').trim()
          skills = [{ id: `local:${entry.replace(/\.md$/, '')}`, name: entry.replace(/\.md$/, ''), description, plugin: pluginId }]
        } catch {
          if (existsSync(selfSkillMd)) {
            // 目录本身是一个 skill（如 gstack/SKILL.md）
            const fm = parseSkillFrontmatter(selfSkillMd)
            description = (fm.description || '').replace(/\n.*/s, '').trim()
            skills = [{ id: `local:${entry}`, name: entry, description, plugin: pluginId }]
          } else {
            // 目录是 skill 集合（每个子目录/文件是一个 skill）
            skills = readSkillsFromDir(entryPath, pluginId)
          }
        }
        if (skills.length === 0) continue
        const id = pluginId
        plugins.push({
          id, name: entry, vendor: 'local',
          version: '', source: 'local',
          skills, skillCount: skills.length,
          enabled: enabledMap[id] !== false
        })
      }
    } catch {}
  }

  return plugins
}

app.get('/api/skills', (req, res) => {
  const settings = loadSettings()
  const enabled = settings.enabledPlugins || {}
  res.json(getAllPlugins(enabled))
})

app.get('/api/skills/all', (req, res) => {
  const settings = loadSettings()
  const enabled = settings.enabledPlugins || {}
  const all = []
  for (const plugin of getAllPlugins(enabled)) {
    if (plugin.enabled !== false) all.push(...plugin.skills)
  }
  res.json(all)
})

app.put('/api/skills/:id/toggle', (req, res) => {
  const { enabled } = req.body
  const settings = loadSettings()
  if (!settings.enabledPlugins) settings.enabledPlugins = {}
  settings.enabledPlugins[req.params.id] = enabled
  import('fs').then(({ writeFileSync }) => {
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
    res.json({ ok: true })
  })
})

app.post('/api/skills/install', (req, res) => {
  const { source, value } = req.body
  if (!value) return res.status(400).json({ error: 'Missing value' })
  if (source === 'path') {
    if (!existsSync(value)) return res.status(400).json({ error: 'Path not found' })
    const name = value.split('/').pop()
    const dest = join(PLUGINS_DIR, 'local', name)
    mkdirSync(dest, { recursive: true })
    try {
      readdirSync(value).forEach(f => copyFileSync(join(value, f), join(dest, f)))
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: e.message }) }
  } else if (source === 'url') {
    let url = value.trim()
    // Normalize owner/repo shorthand to full GitHub URL
    if (!url.startsWith('http')) {
      if (/^[\w.-]+\/[\w.-]+$/.test(url)) {
        url = `https://github.com/${url}`
      } else {
        return res.status(400).json({ error: 'Invalid URL or owner/repo format' })
      }
    }
    // Extract repo name from URL
    const repoName = url.replace(/\.git$/, '').split('/').pop()
    if (!repoName) return res.status(400).json({ error: 'Cannot determine repo name from URL' })
    const dest = join(LOCAL_SKILLS_DIR, repoName)
    try {
      const { execSync } = await import('child_process')
      if (!existsSync(dest)) {
        execSync(`git clone ${url} ${dest}`, { timeout: 30000 })
      } else {
        execSync(`git -C ${dest} pull`, { timeout: 30000 })
      }
      res.json({ ok: true, name: repoName })
    } catch (e) {
      res.status(500).json({ error: e.message || 'git operation failed' })
    }
  } else {
    res.status(400).json({ error: 'Unknown source type' })
  }
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
