import React, { useEffect, useState } from 'react'
import MemoryEditor from './MemoryEditor.jsx'
import { useToast } from './Toast.jsx'

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
  const [expanded, setExpanded] = useState({})
  const [editor, setEditor] = useState(null)  // { projectId, memory | null }
  const { showToast } = useToast()

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
    const url = projectId === '__global__'
      ? `/api/global-memories/${encodeURIComponent(memory.file)}`
      : `/api/projects/${projectId}/memories/${encodeURIComponent(memory.file)}`
    const res = await fetch(url, { method: 'DELETE' })
    if (res.ok) showToast(`已删除「${memory.name}」`, 'success')
    else showToast('删除失败', 'error')
    load()
  }

  const totalCount = groups.reduce((s, g) => s + g.memories.length, 0)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>记忆管理</div>
        <button onClick={load} title="刷新" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}>↻</button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
        共 {totalCount} 条记忆，来自 {groups.length} 个项目
      </div>

      {loading
        ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
        : groups.length === 0
          ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>暂无记忆数据</div>
          : groups.map((g, gi) => (
              <div key={g.id} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{g.name}</div>
                  {g.id === '__global__' && (
                    <span style={{ fontSize: 10, color: 'var(--text2)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px' }}>~/.claude/memory/</span>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{g.memories.length} 条</div>
                  <button
                    onClick={() => setEditor({ projectId: g.id, memory: null })}
                    style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 11, borderRadius: 4, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
                  >+ 新建</button>
                </div>
                {g.id === '__global__' && g.memories.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', padding: '10px 0', fontStyle: 'italic' }}>暂无全局记忆，点击「+ 新建」创建跨项目共享记忆</div>
                )}
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
