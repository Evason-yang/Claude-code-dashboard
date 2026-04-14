import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

function highlight(text, query) {
  if (!query || !text) return text
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

const HISTORY_KEY = 'cc-search-history'
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}
function addToHistory(q) {
  const h = getHistory().filter(x => x !== q)
  h.unshift(q)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 10)))
}

const PAGE_SIZE = 5

export default function GlobalSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState(getHistory)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // 进入页面自动聚焦
  useEffect(() => { inputRef.current?.focus() }, [])

  // 监听 URL q 参数变化，自动触发搜索
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && q.trim().length >= 1) {
      setQuery(q)
      setLoading(true)
      setSearched(true)
      setExpanded({})
      setVisibleCount(PAGE_SIZE)
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => {
          setResults(data)
          setLoading(false)
          addToHistory(q)
          setHistory(getHistory())
        })
    }
  }, [searchParams.get('q')])

  async function doSearch(q) {
    if (!q || q.trim().length < 1) return
    setShowHistory(false)
    setSearchParams({ q })  // 更新 URL，触发上面的 useEffect
  }

  function handleKey(e) {
    if (e.key === 'Enter') doSearch(query)
    if (e.key === 'Escape') setShowHistory(false)
  }

  function removeHistoryItem(e, item) {
    e.stopPropagation()
    const updated = getHistory().filter(x => x !== item)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    setHistory(updated)
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
    setShowHistory(false)
  }

  const totalSessions = results.reduce((s, g) => s + g.results.length, 0)
  const totalMatches = results.reduce((s, g) => s + g.results.reduce((ss, r) => ss + r.matchCount, 0), 0)
  const visibleResults = results.slice(0, visibleCount)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>全局会话搜索</div>

      {/* 搜索框 */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => { if (history.length > 0) setShowHistory(true) }}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            placeholder="搜索所有项目的会话内容..."
            style={{ flex: 1, padding: '10px 14px', fontSize: 14, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', outline: 'none' }}
          />
          <button
            onClick={() => doSearch(query)}
            disabled={loading || query.trim().length < 1}
            style={{ padding: '10px 22px', fontSize: 13, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', opacity: query.trim().length < 1 ? 0.5 : 1, fontWeight: 500 }}
          >
            {loading ? '搜索中...' : '搜索'}
          </button>
        </div>

        {/* 历史下拉 */}
        {showHistory && history.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 56, marginTop: 4, background: 'var(--bg-secondary, var(--bg2))', border: '1px solid var(--border)', borderRadius: 8, zIndex: 100, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            {history.map(item => (
              <div
                key={item}
                onMouseDown={() => { setQuery(item); doSearch(item) }}
                style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', cursor: 'pointer', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3, var(--border))'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <span style={{ fontSize: 13, flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item}
                </span>
                <span
                  onMouseDown={e => removeHistoryItem(e, item)}
                  style={{ fontSize: 12, color: 'var(--text2)', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                  title="删除"
                >×</span>
              </div>
            ))}
            <div
              onMouseDown={clearHistory}
              style={{ padding: '7px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', borderTop: '1px solid var(--border)', textAlign: 'center' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3, var(--border))'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              清除全部
            </div>
          </div>
        )}
      </div>

      {/* 结果统计 */}
      {searched && !loading && (
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
          {results.length === 0
            ? `未找到包含「${query}」的会话`
            : `在 ${results.length} 个项目中找到 ${totalSessions} 条会话，共 ${totalMatches} 处匹配`
          }
        </div>
      )}

      {/* 按项目分组结果 */}
      {visibleResults.map(group => (
        <div key={group.id} style={{ marginBottom: 24 }}>
          {/* 项目标题 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            <span
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}
              onClick={() => navigate(`/projects/${group.id}`)}
            >
              {group.name}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>
              {group.results.length} 条会话 · {group.results.reduce((s, r) => s + r.matchCount, 0)} 处匹配
            </span>
          </div>

          {/* 会话列表 */}
          {group.results.map(r => {
            const key = `${group.id}:${r.sessionId}`
            const isOpen = expanded[key]
            return (
              <div key={r.sessionId} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 6, overflow: 'hidden', marginLeft: 15 }}>
                <div
                  onClick={() => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))}
                  style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {highlight(r.title, query)}
                  </span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--accent)22', color: 'var(--accent)', flexShrink: 0 }}>
                    {r.matchCount} 处
                  </span>
                  {r.sessionTs && (
                    <span style={{ fontSize: 11, color: 'var(--text2)', flexShrink: 0 }}>
                      {new Date(r.sessionTs).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                  {/* 跳转到项目会话历史 */}
                  <span
                    onClick={e => { e.stopPropagation(); navigate(`/projects/${group.id}/sessions`) }}
                    title="在会话历史中查看"
                    style={{ fontSize: 11, color: 'var(--text2)', cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}
                  >↗</span>
                  <span style={{ fontSize: 10, color: 'var(--text2)', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
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
            )
          })}
        </div>
      ))}

      {/* 显示更多 */}
      {results.length > visibleCount && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            style={{ padding: '8px 24px', fontSize: 13, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer' }}
          >
            显示更多项目（还有 {results.length - visibleCount} 个）
          </button>
        </div>
      )}
    </div>
  )
}
