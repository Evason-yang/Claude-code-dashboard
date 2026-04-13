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
