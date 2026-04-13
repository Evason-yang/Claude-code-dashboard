import React, { useEffect, useState } from 'react'
import UsagePage from './UsagePage.jsx'
import { ModelBadge, MessageThread, relativeTime, fmtTime, fmt, duration } from './MessageThread.jsx'

const MODEL_COLORS = {
  'claude-opus-4-6': '#58a6ff',
  'claude-opus-4-6[1m]': '#79c0ff',
  'claude-sonnet-4-6': '#3fb950',
  'claude-haiku-4-5': '#f78166',
  '<synthetic>': '#8b949e',
  'default': '#8b949e'
}

function PieChart({ data, size = 72 }) {
  if (!data.length) return null
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return null
  const r = size / 2 - 4, ir = r * 0.55
  const cx = size / 2, cy = size / 2
  let angle = -Math.PI / 2
  const slices = data.map(d => {
    const sweep = (d.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    const ix1 = cx + ir * Math.cos(angle), iy1 = cy + ir * Math.sin(angle)
    angle += sweep
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle)
    const ix2 = cx + ir * Math.cos(angle), iy2 = cy + ir * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return { ...d, path: `M${ix1},${iy1} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${ir},${ir} 0 ${large},0 ${ix1},${iy1} Z` }
  })
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.9} />)}
    </svg>
  )
}

// 最近会话卡片（含头部信息 + 消息线程）
function RecentSessionCard({ projectId, session }) {
  const realModels = (session.models || []).filter(m => m !== '<synthetic>')
  const dur = duration(session.createdAt, session.updatedAt)

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      {/* 头部：标题 + 模型 + 时间 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.title}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {realModels.map(m => <ModelBadge key={m} model={m} />)}
          </div>
        </div>
        {/* 时间 + token 明细 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--text2)' }}>
          <span>开始 <b style={{ color: 'var(--text)' }}>{fmtTime(session.createdAt)}</b></span>
          {dur && <span>时长 <b style={{ color: 'var(--text)' }}>{dur}</b></span>}
          <span>{session.messageCount} 条消息</span>
          {session.usage?.total > 0 && <>
            <span>输入 <b style={{ color: 'var(--text)' }}>{fmt(session.usage.inputTokens)}</b></span>
            <span>输出 <b style={{ color: 'var(--text)' }}>{fmt(session.usage.outputTokens)}</b></span>
            <span>合计 <b style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{fmt(session.usage.total)}</b></span>
          </>}
        </div>
      </div>
      {/* 消息线程：自动滚到最后一条 */}
      <MessageThread projectId={projectId} sessionId={session.id} maxHeight={520} />
    </div>
  )
}

export default function OverviewTab({ project, refreshKey }) {
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)

  useEffect(() => {
    setSessionsLoading(true)
    fetch(`/api/projects/${project.id}/sessions`)
      .then(r => r.json())
      .then(data => { setSessions(data); setSessionsLoading(false) })
  }, [project.id, refreshKey])

  function openInTerminal() {
    fetch('/api/open-terminal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: project.path }) })
  }
  function copyPath() {
    navigator.clipboard.writeText(project.path).then(() => alert('路径已复制'))
  }

  const latestSession = sessions[0] || null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 路径 + 操作 */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>项目路径</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', wordBreak: 'break-all', lineHeight: 1.5 }}>{project.path}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={openInTerminal} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff' }}>在终端中打开</button>
          <button onClick={() => fetch('/api/launch-claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: project.path }) })} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 5, border: 'none', cursor: 'pointer', background: '#3fb950', color: '#fff' }}>启动 Claude</button>
          <button onClick={copyPath} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg2)', color: 'var(--text)' }}>复制路径</button>
        </div>
      </div>

      {/* 用量统计（嵌入） */}
      <UsagePage projectId={project.id} embedded />

      {/* 最近会话 */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          最近会话
          {project.lastActive && (
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
              · 最后活动 {relativeTime(project.lastActive)}
            </span>
          )}
        </div>
        {sessionsLoading
          ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
          : latestSession
            ? <RecentSessionCard projectId={project.id} session={latestSession} />
            : <div style={{ color: 'var(--text2)', fontSize: 13 }}>暂无会话记录</div>
        }
      </div>
    </div>
  )
}
