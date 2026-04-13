import React, { useState, useRef } from 'react'

function highlight(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--accent)33', color: 'var(--accent)', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function SessionSearchTab({ project }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expanded, setExpanded] = useState({})
  const inputRef = useRef(null)

  async function search(q) {
    if (!q || q.trim().length < 2) return
    setLoading(true); setSearched(true)
    const res = await fetch(`/api/projects/${project.id}/search?q=${encodeURIComponent(q)}`)
    setResults(await res.json())
    setLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter') search(query)
  }

  return (
    <div>
      {/* 搜索框 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="搜索会话内容..."
          autoFocus
          style={{ flex: 1, padding: '8px 12px', fontSize: 14, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
        />
        <button onClick={() => search(query)} disabled={loading || query.trim().length < 2}
          style={{ padding: '8px 18px', fontSize: 13, borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', opacity: query.trim().length < 2 ? 0.5 : 1 }}>
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {/* 结果 */}
      {searched && !loading && results.length === 0 && (
        <div style={{ color: 'var(--text2)', fontSize: 13 }}>未找到包含「{query}」的会话</div>
      )}
      {results.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
          找到 {results.length} 条会话，共 {results.reduce((s, r) => s + r.matchCount, 0)} 处匹配
        </div>
      )}
      {results.map(r => (
        <div key={r.sessionId} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 8, overflow: 'hidden' }}>
          {/* 会话标题行 */}
          <div
            onClick={() => setExpanded(prev => ({ ...prev, [r.sessionId]: !prev[r.sessionId] }))}
            style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {highlight(r.title, query)}
            </span>
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--accent)22', color: 'var(--accent)', flexShrink: 0 }}>
              {r.matchCount} 处匹配
            </span>
            {r.sessionTs && (
              <span style={{ fontSize: 11, color: 'var(--text2)', flexShrink: 0 }}>
                {new Date(r.sessionTs).toLocaleDateString('zh-CN')}
              </span>
            )}
            <span style={{ fontSize: 10, color: 'var(--text2)', flexShrink: 0 }}>
              {expanded[r.sessionId] ? '▲' : '▼'}
            </span>
          </div>
          {/* 匹配片段 */}
          {expanded[r.sessionId] && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {r.matches.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: m.role === 'user' ? 'var(--accent-bg)' : 'var(--bg3)', color: m.role === 'user' ? 'var(--accent)' : 'var(--text2)', flexShrink: 0, marginTop: 1 }}>
                    {m.role === 'user' ? '用户' : 'Claude'}
                  </span>
                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                    {highlight(m.snippet, query)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
