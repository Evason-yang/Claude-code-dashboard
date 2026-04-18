import { readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { join, basename } from 'path'
import os from 'os'

const sessionCache = new Map()
const SESSION_CACHE_MAX = 100

function cacheSet(key, value) {
  if (sessionCache.size >= SESSION_CACHE_MAX) {
    // Delete oldest entry (Map preserves insertion order)
    sessionCache.delete(sessionCache.keys().next().value)
  }
  sessionCache.set(key, value)
}

function getCacheKey(filePath) {
  try {
    const mtime = statSync(filePath).mtimeMs
    return `${filePath}:${mtime}`
  } catch {
    return null
  }
}

// Claude Code 把会话存在 ~/.claude/projects/<encoded-path>/
// 编码规则：统一转为 /，再全部替换为 -
export function encodePath(projectPath) {
  // Windows 路径：C:\Users\foo → C:/Users/foo → C-/Users/foo... 需特殊处理驱动器号
  let p = projectPath.replace(/\\/g, '/')
  // Windows 驱动器号 C:/ → C/（去掉冒号）
  p = p.replace(/^([A-Za-z]):\//, '$1/')
  return p.replace(/\//g, '-')
}

export function getClaudeProjectDir(projectPath) {
  return join(os.homedir(), '.claude', 'projects', encodePath(projectPath))
}

function parseLines(content) {
  return content.trim().split('\n').flatMap(line => {
    try { return [JSON.parse(line)] } catch { return [] }
  })
}

function extractText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.filter(b => b.type === 'text').map(b => b.text).join(' ')
  }
  return ''
}

// user 消息：只保留真实用户输入（type === 'text'），跳过 tool_result
function isRealUserMessage(msg) {
  if (msg.role !== 'user') return false
  const content = msg.content
  if (typeof content === 'string') return content.trim().length > 0
  if (Array.isArray(content)) {
    // 只有全是 tool_result 的消息跳过
    return content.some(b => b.type === 'text')
  }
  return false
}

// assistant 消息：只保留含 text 的消息，纯 tool_use 的跳过
function isRealAssistantMessage(msg) {
  if (msg.role !== 'assistant') return false
  const content = msg.content
  if (typeof content === 'string') return content.trim().length > 0
  if (Array.isArray(content)) {
    return content.some(b => b.type === 'text')
  }
  return false
}

export function listSessions(projectPath) {
  const dir = getClaudeProjectDir(projectPath)
  if (!existsSync(dir)) return []
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'))
    return files
      .map(f => {
        const id = basename(f, '.jsonl')
        const filePath = join(dir, f)
        const cacheKey = getCacheKey(filePath)
        const listCacheKey = cacheKey ? `list:${cacheKey}` : null
        if (listCacheKey && sessionCache.has(listCacheKey)) {
          return sessionCache.get(listCacheKey)
        }
        const lines = parseLines(readFileSync(filePath, 'utf8'))
        let title = '（无内容）'
        let messageCount = 0
        let inputTokens = 0, outputTokens = 0, cacheRead = 0, cacheCreate = 0
        let models = new Set()
        let firstTs = null, lastTs = null

        for (const obj of lines) {
          const msg = obj.message
          if (!msg) continue
          const ts = obj.timestamp
          if (ts) {
            if (!firstTs || ts < firstTs) firstTs = ts
            if (!lastTs || ts > lastTs) lastTs = ts
          }
          if (isRealUserMessage(msg) && title === '（无内容）') {
            const text = extractText(msg.content)
            if (text) title = text.slice(0, 60)
          }
          if (isRealUserMessage(msg) || isRealAssistantMessage(msg)) messageCount++
          if (msg.model) models.add(msg.model)
          if (msg.usage) {
            inputTokens += msg.usage.input_tokens || 0
            outputTokens += msg.usage.output_tokens || 0
            cacheRead += msg.usage.cache_read_input_tokens || 0
            cacheCreate += msg.usage.cache_creation_input_tokens || 0
          }
        }

        const entry = {
          id, title, messageCount,
          createdAt: firstTs, updatedAt: lastTs,
          models: [...models],
          usage: { inputTokens, outputTokens, cacheRead, cacheCreate,
                   total: inputTokens + outputTokens + cacheRead + cacheCreate }
        }
        if (listCacheKey) cacheSet(listCacheKey, entry)
        return entry
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
  const dir = getClaudeProjectDir(projectPath)
  const filePath = join(dir, `${sessionId}.jsonl`)
  if (!existsSync(filePath)) return []
  const cacheKey = getCacheKey(filePath)
  const detailCacheKey = cacheKey ? `detail:${cacheKey}` : null
  if (detailCacheKey && sessionCache.has(detailCacheKey)) {
    return sessionCache.get(detailCacheKey)
  }
  const lines = parseLines(readFileSync(filePath, 'utf8'))
  const result = []

  // 收集所有 Agent tool_use id → 描述/类型/prompt 的映射
  const agentCalls = {}  // tool_use_id → { description, subagent_type, prompt }

  for (const obj of lines) {
    const msg = obj.message
    if (!msg || !msg.role) continue
    const content = msg.content
    const ts = obj.timestamp

    if (msg.role === 'assistant') {
      if (!Array.isArray(content)) continue
      const textBlocks = content.filter(b => b.type === 'text')
      const agentBlocks = content.filter(b => b.type === 'tool_use' && b.name === 'Agent')
      const otherToolBlocks = content.filter(b => b.type === 'tool_use' && b.name !== 'Agent')

      // 普通文本回复
      if (textBlocks.length > 0) {
        result.push({
          role: 'assistant',
          content: textBlocks.map(b => b.text).join('\n'),
          timestamp: ts,
          model: msg.model || null,
          usage: msg.usage || null
        })
      }

      // Agent 调用（每个独立展示）
      for (const b of agentBlocks) {
        const inp = b.input || {}
        agentCalls[b.id] = {
          description: inp.description || 'Agent',
          subagent_type: inp.subagent_type || '',
          prompt: inp.prompt || ''
        }
        result.push({
          role: 'agent_call',
          tool_use_id: b.id,
          description: inp.description || 'Agent',
          subagent_type: inp.subagent_type || '',
          prompt: inp.prompt || '',
          timestamp: ts,
          model: msg.model || null
        })
      }

    } else if (msg.role === 'user') {
      if (!Array.isArray(content)) {
        // 纯字符串用户消息
        if (typeof content === 'string' && content.trim()) {
          result.push({ role: 'user', content, timestamp: ts, model: null, usage: null })
        }
        continue
      }

      const textBlocks = content.filter(b => b.type === 'text')
      const toolResults = content.filter(b => b.type === 'tool_result')

      // 真实用户文字
      if (textBlocks.length > 0) {
        const text = textBlocks.map(b => b.text).join('\n')
        if (text.trim()) {
          result.push({ role: 'user', content: text, timestamp: ts, model: null, usage: null })
        }
      }

      // Agent 结果
      for (const b of toolResults) {
        const toolId = b.tool_use_id
        if (!agentCalls[toolId]) continue  // 不是 Agent 的 tool_result 跳过
        const rc = b.content
        let output = ''
        if (typeof rc === 'string') output = rc
        else if (Array.isArray(rc)) output = rc.filter(x => x.type === 'text').map(x => x.text).join('\n')
        // 提取 agentId 行之前的主要输出（去掉末尾的 agentId/usage 行）
        const cleanOutput = output.replace(/\nagentId:.*$/s, '').replace(/\n<usage>.*$/s, '').trim()
        result.push({
          role: 'agent_result',
          tool_use_id: toolId,
          description: agentCalls[toolId].description,
          subagent_type: agentCalls[toolId].subagent_type,
          content: cleanOutput,
          timestamp: ts
        })
      }
    }
  }

  if (detailCacheKey) cacheSet(detailCacheKey, result)
  return result
}
