import React, { useEffect, useState } from 'react'

function CommandEditor({ cmd, projectId, onClose, onSaved }) {
  const [name, setName] = useState(cmd?.name || '')
  const [description, setDescription] = useState(cmd?.description || '')
  const [content, setContent] = useState(cmd?.content || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return alert('命令名不能为空')
    setSaving(true)
    const url = cmd ? `/api/commands/${encodeURIComponent(cmd.file)}` : '/api/commands'
    const method = cmd ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'project', projectId, name, description, content })
    })
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, width: 520, maxWidth: '92vw', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{cmd ? '编辑命令' : '新建项目命令'}</div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>命令名（不含 /）</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="my-command" autoFocus
            style={{ width: '100%', padding: '7px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', fontFamily: 'monospace' }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>描述</div>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="命令用途简介"
            style={{ width: '100%', padding: '7px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)' }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>内容</div>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="命令内容..."
            style={{ width: '100%', minHeight: 160, padding: '8px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.6 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer' }}>取消</button>
          <button onClick={save} disabled={saving} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectCommandsTab({ project, refreshKey }) {
  const [commands, setCommands] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [editor, setEditor] = useState(null)

  function load() {
    setLoading(true)
    fetch(`/api/commands?projectId=${project.id}`)
      .then(r => r.json())
      .then(data => {
        // 只展示该项目的命令（project scope）
        setCommands(data.filter(c => c.scope === 'project'))
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [project.id, refreshKey])

  async function handleDelete(cmd) {
    if (!window.confirm(`删除命令 /${cmd.name}？`)) return
    await fetch(`/api/commands/${encodeURIComponent(cmd.file)}?scope=project&projectId=${project.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{commands.length} 条项目级命令</div>
        <button onClick={() => setEditor('new')}
          style={{ marginLeft: 'auto', padding: '5px 14px', fontSize: 12, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
          + 新建
        </button>
      </div>

      {loading
        ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
        : commands.length === 0
          ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>暂无项目级命令，点击「新建」创建第一条</div>
          : commands.map(cmd => (
              <div key={cmd.file} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 8, overflow: 'hidden' }}>
                <div onClick={() => setExpanded(expanded === cmd.file ? null : cmd.file)}
                  style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>/{cmd.name}</span>
                  {cmd.description && <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cmd.description}</span>}
                  <button onClick={e => { e.stopPropagation(); setEditor(cmd) }} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>编辑</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(cmd) }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>删除</button>
                  <span style={{ fontSize: 10, color: 'var(--text2)' }}>{expanded === cmd.file ? '▲' : '▼'}</span>
                </div>
                {expanded === cmd.file && (
                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--bg3)', fontFamily: 'monospace', lineHeight: 1.6 }}>
                    {cmd.content || <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>（无内容）</span>}
                  </div>
                )}
              </div>
            ))
      }

      {editor && (
        <CommandEditor
          cmd={editor === 'new' ? null : editor}
          projectId={project.id}
          onClose={() => setEditor(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
