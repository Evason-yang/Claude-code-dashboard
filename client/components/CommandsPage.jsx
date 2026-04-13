import React, { useEffect, useState } from 'react'

const btn = (primary) => ({
  padding: '6px 14px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
  border: primary ? 'none' : '1px solid var(--border)',
  background: primary ? 'var(--accent)' : 'var(--bg2)',
  color: primary ? '#fff' : 'var(--text)'
})
const label = { fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }

function CommandEditor({ cmd, projectId, projects, onClose, onSaved }) {
  const [name, setName] = useState(cmd?.name || '')
  const [description, setDescription] = useState(cmd?.description || '')
  const [content, setContent] = useState(cmd?.content || '')
  const [scope, setScope] = useState(cmd?.scope === 'project' ? 'project' : 'global')
  const [selProjectId, setSelProjectId] = useState(projectId || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) return alert('命令名不能为空')
    setSaving(true)
    const url = cmd ? `/api/commands/${encodeURIComponent(cmd.file)}` : '/api/commands'
    const method = cmd ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope,
        projectId: scope === 'project' ? selProjectId : undefined,
        name, description, content
      })
    })
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, width: 520, maxWidth: '92vw', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{cmd ? '编辑命令' : '新建命令'}</div>
        <div>
          <div style={label}>范围</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['global', 'project'].map(s => (
              <button key={s} onClick={() => setScope(s)} style={{ ...btn(scope === s), fontSize: 12 }}>
                {s === 'global' ? '全局' : '项目级'}
              </button>
            ))}
          </div>
          {scope === 'project' && (
            <select value={selProjectId} onChange={e => setSelProjectId(e.target.value)}
              style={{ marginTop: 6, padding: '5px 8px', fontSize: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', width: '100%' }}>
              <option value="">选择项目...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <div style={label}>命令名（不含 /）</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="my-command" autoFocus
            style={{ width: '100%', padding: '7px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', fontFamily: 'monospace' }} />
        </div>
        <div>
          <div style={label}>描述</div>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="命令用途简介"
            style={{ width: '100%', padding: '7px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)' }} />
        </div>
        <div>
          <div style={label}>内容（发送给 Claude 的指令）</div>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="命令内容..."
            style={{ width: '100%', minHeight: 160, padding: '8px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.6 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btn(false)}>取消</button>
          <button onClick={save} disabled={saving} style={btn(true)}>{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  )
}

export default function CommandsPage() {
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [commands, setCommands] = useState([])
  const [editor, setEditor] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects)
  }, [])

  function load() {
    const params = projectId ? `?projectId=${projectId}` : ''
    fetch(`/api/commands${params}`).then(r => r.json()).then(setCommands)
  }

  useEffect(() => { load() }, [projectId])

  async function handleDelete(cmd) {
    if (!window.confirm(`删除命令 /${cmd.name}？`)) return
    const params = new URLSearchParams({ scope: cmd.scope })
    if (projectId) params.set('projectId', projectId)
    await fetch(`/api/commands/${encodeURIComponent(cmd.file)}?${params}`, { method: 'DELETE' })
    load()
  }

  function CmdList({ cmds, title, readonly }) {
    if (!cmds.length) return null
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{title}（{cmds.length}）</div>
        {cmds.map(cmd => {
          const key = `${cmd.scope}-${cmd.file}`
          return (
            <div key={key} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 6, overflow: 'hidden' }}>
              <div onClick={() => setExpanded(expanded === key ? null : key)}
                style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>/{cmd.name}</span>
                {cmd.description && <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cmd.description}</span>}
                {!readonly && <>
                  <button onClick={e => { e.stopPropagation(); setEditor(cmd) }} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>编辑</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(cmd) }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>删除</button>
                </>}
                {readonly && <span style={{ fontSize: 10, color: 'var(--text2)', padding: '1px 5px', borderRadius: 3, background: 'var(--bg3)', flexShrink: 0 }}>只读</span>}
                <span style={{ fontSize: 10, color: 'var(--text2)', flexShrink: 0 }}>{expanded === key ? '▲' : '▼'}</span>
              </div>
              {expanded === key && (
                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--bg3)', fontFamily: 'monospace', lineHeight: 1.6 }}>
                  {cmd.content || <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>（无内容）</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const pluginCmds = commands.filter(c => c.scope === 'plugin')
  const globalCmds = commands.filter(c => c.scope === 'global')
  const projectCmds = commands.filter(c => c.scope === 'project')

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Slash Commands</div>
        <button onClick={load} title="刷新" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}>↻</button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>管理全局和项目级 Slash Commands</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <select value={projectId} onChange={e => setProjectId(e.target.value)}
          style={{ padding: '5px 8px', fontSize: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)' }}>
          <option value="">仅全局命令</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}（含项目级）</option>)}
        </select>
        <button onClick={() => setEditor('new')} style={{ ...btn(true), marginLeft: 'auto' }}>+ 新建命令</button>
      </div>

      <CmdList cmds={pluginCmds} title="插件命令（只读）" readonly />
      <CmdList cmds={globalCmds} title="全局命令" />
      <CmdList cmds={projectCmds} title="项目级命令" />
      {!commands.length && <div style={{ color: 'var(--text2)', fontSize: 13 }}>暂无 Slash Commands</div>}

      {editor && (
        <CommandEditor
          cmd={editor === 'new' ? null : editor}
          projectId={projectId}
          projects={projects}
          onClose={() => setEditor(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
