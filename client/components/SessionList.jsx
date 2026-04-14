import React, { useEffect, useRef, useState } from 'react'
import { ModelBadge, MessageThread, relativeTime, fmtTime, fmt, duration } from './MessageThread.jsx'

function SessionItem({ session, projectId }) {
  const [open, setOpen] = useState(false)
  const realModels = (session.models || []).filter(m => m !== '<synthetic>')
  const dur = duration(session.createdAt, session.updatedAt)
  const agentCount = 0  // 在列表阶段不知道，展开后由 MessageThread 内部展示

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 8, overflow: 'hidden' }}>
      {/* 头部行 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {session.title}
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {realModels.slice(0, 2).map(m => <ModelBadge key={m} model={m} />)}
        </div>
        {session.usage?.total > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text2)', flexShrink: 0, fontFamily: 'monospace' }}>
            {fmt(session.usage.total)} tok
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--text2)', flexShrink: 0 }}>
          {session.messageCount}条 · {relativeTime(session.updatedAt)}
        </span>
        <span style={{ color: 'var(--text2)', fontSize: 10, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* 时间 + token 明细栏 */}
          <div style={{ padding: '7px 14px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--text2)' }}>
            <span>开始 <b style={{ color: 'var(--text)' }}>{fmtTime(session.createdAt)}</b></span>
            {dur && <span>时长 <b style={{ color: 'var(--text)' }}>{dur}</b></span>}
            {session.usage?.total > 0 && <>
              <span>输入 <b style={{ color: 'var(--text)' }}>{fmt(session.usage.inputTokens)}</b></span>
              <span>输出 <b style={{ color: 'var(--text)' }}>{fmt(session.usage.outputTokens)}</b></span>
              <span>缓存 <b style={{ color: 'var(--text)' }}>{fmt(session.usage.cacheRead)}</b></span>
              <span>合计 <b style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{fmt(session.usage.total)}</b></span>
            </>}
            {realModels.length > 0 && <span>模型 <b style={{ color: 'var(--text)' }}>{realModels.join(', ')}</b></span>}
          </div>
          {/* 消息线程：自动滚到最后一条 */}
          <MessageThread projectId={projectId} sessionId={session.id} maxHeight={600} />
        </div>
      )}
    </div>
  )
}

function toISO(d) { return d.toISOString().slice(0, 10) }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d) }

const PRESETS = [
  { label: '7天', days: 7 },
  { label: '30天', days: 30 },
  { label: '全部', days: 0 },
]

const PAGE_SIZE = 30

export default function SessionList({ project, refreshKey }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState(30)
  const [since, setSince] = useState(daysAgo(30))
  const [until, setUntil] = useState(toISO(new Date()))
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    setLoading(true)
    setVisibleCount(PAGE_SIZE)
    fetch(`/api/projects/${project.id}/sessions`)
      .then(r => r.json())
      .then(data => { setSessions(data); setLoading(false) })
  }, [project.id, refreshKey])

  function applyPreset(days) {
    setPreset(days)
    setVisibleCount(PAGE_SIZE)
    if (days === 0) { setSince(''); setUntil('') }
    else { setSince(daysAgo(days)); setUntil(toISO(new Date())) }
  }

  const filtered = sessions.filter(s => {
    if (!s.updatedAt) return true
    const d = s.updatedAt.slice(0, 10)
    if (since && d < since) return false
    if (until && d > until) return false
    return true
  })

  const totalTokens = filtered.reduce((s, x) => s + (x.usage?.total || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {PRESETS.map(p => (
            <button key={p.days} onClick={() => applyPreset(p.days)} style={{
              padding: '3px 9px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)',
              cursor: 'pointer',
              background: preset === p.days ? 'var(--accent)' : 'var(--bg2)',
              color: preset === p.days ? '#fff' : 'var(--text)'
            }}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
          <input type="date" value={since} onChange={e => { setSince(e.target.value); setPreset(null) }}
            style={{ padding: '2px 6px', fontSize: 11, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }} />
          <span style={{ color: 'var(--text2)' }}>—</span>
          <input type="date" value={until} onChange={e => { setUntil(e.target.value); setPreset(null) }}
            style={{ padding: '2px 6px', fontSize: 11, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }} />
        </div>
      </div>

      {loading
        ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
        : <>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
              {filtered.length} 条会话 · {totalTokens >= 1e6 ? (totalTokens / 1e6).toFixed(1) + 'M' : Math.round(totalTokens / 1000) + 'K'} tokens
            </div>
            {filtered.length === 0
              ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>该时间段内暂无会话</div>
              : <>
                  {filtered.slice(0, visibleCount).map(s => <SessionItem key={s.id} session={s} projectId={project.id} />)}
                  {filtered.length > visibleCount && (
                    <button
                      onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                      style={{ width: '100%', padding: '8px 0', fontSize: 12, color: 'var(--text2)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', marginTop: 4 }}
                    >
                      加载更多（剩余 {filtered.length - visibleCount} 条）
                    </button>
                  )}
                </>
            }
          </>
      }
    </div>
  )
}
