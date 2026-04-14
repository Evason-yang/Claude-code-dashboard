// 共用的消息线程渲染组件，供 OverviewTab 和 SessionList 共用
import React, { useEffect, useRef, useState } from 'react'

// 会话消息内存缓存（key: projectId+sessionId）
const messageCache = new Map()

export const MODEL_COLORS = {
  'claude-opus-4-6': '#58a6ff',
  'claude-opus-4-6[1m]': '#79c0ff',
  'claude-sonnet-4-6': '#3fb950',
  'claude-haiku-4-5': '#f78166',
  '<synthetic>': '#8b949e',
  'default': '#8b949e'
}

const AGENT_TYPE_LABELS = {
  'general-purpose': '通用', 'Explore': '探索', 'Plan': '规划',
  'claude-code-guide': '指南', 'superpowers:code-reviewer': '代码审查',
  'superpowers:brainstorm': '头脑风暴', 'superpowers:brainstorming': '头脑风暴',
  'superpowers:debugging': '调试', 'superpowers:systematic-debugging': '系统调试',
  'superpowers:writing-plans': '编写计划', 'superpowers:executing-plans': '执行计划',
  'superpowers:test-driven-development': 'TDD', 'superpowers:verification-before-completion': '验证',
  'superpowers:dispatching-parallel-agents': '并行派遣', 'superpowers:subagent-driven-development': '子代理开发',
  'superpowers:finishing-a-development-branch': '完成分支', 'superpowers:receiving-code-review': '接收审查',
  'superpowers:requesting-code-review': '请求审查', 'superpowers:using-git-worktrees': 'Git Worktree',
  'superpowers:writing-skills': '编写 Skill', 'superpowers:using-superpowers': '超能力',
  'superpowers:execute-plan': '执行计划', 'superpowers:write-plan': '编写计划',
}

function agentTypeLabel(type) {
  if (!type) return 'Agent'
  if (AGENT_TYPE_LABELS[type]) return AGENT_TYPE_LABELS[type]
  const suffix = type.includes(':') ? type.split(':').pop() : type
  return suffix.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

export function fmt(n) {
  if (!n) return '0'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return String(n)
}

export function relativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso)
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '刚刚'
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

export function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function duration(start, end) {
  if (!start || !end) return null
  const ms = new Date(end) - new Date(start)
  const m = Math.floor(ms / 60000)
  if (m < 1) return '< 1 分钟'
  if (m < 60) return `${m} 分钟`
  const h = Math.floor(m / 60)
  return `${h} 小时 ${m % 60} 分钟`
}

export function ModelBadge({ model }) {
  if (!model || model === '<synthetic>') return null
  const color = MODEL_COLORS[model] || MODEL_COLORS.default
  const short = model.replace('claude-', '').replace(/-4-[56]/g, '').replace('[1m]', ' 1M')
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 4,
      fontSize: 10, fontWeight: 600, color,
      border: `1px solid ${color}44`, background: `${color}18`, flexShrink: 0
    }}>{short}</span>
  )
}

// Agent 调用卡片
export function AgentBlock({ callMsg, resultMsg }) {
  const [open, setOpen] = useState(false)
  const typeLabel = agentTypeLabel(callMsg.subagent_type)
  return (
    <div style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 10, margin: '2px 0' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', padding: '5px 0' }}
      >
        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>⊕ Agent</span>
        {typeLabel && (
          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'var(--accent)22', color: 'var(--accent)', fontWeight: 500 }}>
            {typeLabel}
          </span>
        )}
        <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {callMsg.description}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text2)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ paddingBottom: 6 }}>
          {callMsg.prompt && (
            <div style={{ background: 'var(--bg3)', borderRadius: 5, padding: '8px 10px', marginBottom: 6, fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflowY: 'auto', lineHeight: 1.5 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>指令</div>
              {callMsg.prompt}
            </div>
          )}
          {resultMsg?.content && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, padding: '8px 10px', fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 300, overflowY: 'auto', lineHeight: 1.6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>输出</div>
              {resultMsg.content}
            </div>
          )}
          {!resultMsg?.content && (
            <div style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic', padding: '2px 0' }}>（无文本输出）</div>
          )}
        </div>
      )}
    </div>
  )
}

// 将消息列表中的 agent_call + agent_result 配对
export function buildRenderNodes(messages) {
  const resultMap = {}
  for (const m of messages) {
    if (m.role === 'agent_result') resultMap[m.tool_use_id] = m
  }
  const nodes = []
  let i = 0
  while (i < messages.length) {
    const m = messages[i]
    if (m.role === 'agent_call') {
      nodes.push({ type: 'agent', call: m, result: resultMap[m.tool_use_id] || null, key: m.tool_use_id || `agent-${i}` })
      i++
    } else if (m.role === 'agent_result') {
      i++  // 已被 agent_call 消费
    } else {
      nodes.push({ type: 'message', msg: m, key: `msg-${i}` })
      i++
    }
  }
  return nodes
}

function msgTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 消息气泡
function MessageBubble({ m }) {
  const isUser = m.role === 'user'
  const u = m.usage
  // token 信息：只有 assistant 有 usage，展示 output（本次生成量）
  const tokenInfo = !isUser && u && (u.output_tokens || u.outputTokens)
    ? `↑${fmt(u.input_tokens ?? u.inputTokens ?? 0)} ↓${fmt(u.output_tokens ?? u.outputTokens ?? 0)}`
    : null
  const timeStr = msgTime(m.timestamp)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 2 }}>
      {!isUser && m.model && m.model !== '<synthetic>' && <ModelBadge model={m.model} />}
      <div style={{
        maxWidth: '82%', padding: '8px 12px',
        borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        background: isUser ? 'var(--accent-bg)' : 'var(--bg3)',
        color: 'var(--text)',
        border: isUser ? '1px solid var(--accent)22' : '1px solid var(--border)',
      }}>
        {m.content || <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>（工具调用）</span>}
      </div>
      {/* 时间 + token（气泡下方小字，与气泡同侧对齐） */}
      {(timeStr || tokenInfo) && (
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text2)', paddingLeft: isUser ? 0 : 2, paddingRight: isUser ? 2 : 0 }}>
          {timeStr && <span>{timeStr}</span>}
          {tokenInfo && <span style={{ fontFamily: 'monospace' }}>{tokenInfo}</span>}
        </div>
      )}
    </div>
  )
}

/**
 * 完整消息线程，加载后自动滚到最后一条。
 * maxHeight: 容器最大高度（px），默认 520
 */
export function MessageThread({ projectId, sessionId, maxHeight = 520 }) {
  const [messages, setMessages] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const cacheKey = `${projectId}:${sessionId}`
    const cached = messageCache.get(cacheKey)
    if (cached) {
      setMessages(cached)
      return
    }
    setMessages(null)
    fetch(`/api/projects/${projectId}/sessions/${sessionId}`)
      .then(r => r.json())
      .then(msgs => {
        messageCache.set(cacheKey, msgs)
        setMessages(msgs)
      })
  }, [projectId, sessionId])

  // 加载完成后直接跳到底部，不用动画
  useEffect(() => {
    if (messages && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  if (messages === null) {
    return (
      <div style={{ padding: '16px 14px', color: 'var(--text2)', fontSize: 12, textAlign: 'center' }}>
        加载中...
      </div>
    )
  }

  const nodes = buildRenderNodes(messages)

  return (
    <div
      ref={containerRef}
      style={{ maxHeight, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {nodes.map(node =>
        node.type === 'agent'
          ? <AgentBlock key={node.key} callMsg={node.call} resultMsg={node.result} />
          : <MessageBubble key={node.key} m={node.msg} />
      )}
    </div>
  )
}
