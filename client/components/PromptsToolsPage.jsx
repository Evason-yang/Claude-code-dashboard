import React, { useEffect, useState } from 'react'

// ─── 共用样式 ───────────────────────────────────────────────────────────────
const btn = (primary) => ({
  padding: '6px 14px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
  border: primary ? 'none' : '1px solid var(--border)',
  background: primary ? 'var(--accent)' : 'var(--bg2)',
  color: primary ? '#fff' : 'var(--text)'
})
const label = { fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }
// ─── Tab 1: CLAUDE.md Prompt ─────────────────────────────────────────────────
function PromptTab() {
  const [data, setData] = useState(null)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function load() {
    fetch('/api/prompts?scope=global')
      .then(r => r.json())
      .then(d => { setData(d); setContent(d.content || '') })
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    await fetch('/api/prompts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'global', content })
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    load()
  }

  return (
    <div>
      {data && (
        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>
          {data.exists ? `📄 ${data.path}` : `✦ 将创建 ${data.path}`}
        </div>
      )}

      {/* 编辑器 */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="在此输入全局 CLAUDE.md 内容（Markdown 格式，作为 system prompt 注入到每次对话）..."
        style={{
          width: '100%', minHeight: 360, padding: '12px 14px', fontSize: 13,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
          color: 'var(--text)', fontFamily: 'monospace', lineHeight: 1.7, resize: 'vertical'
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <button onClick={save} disabled={saving} style={btn(true)}>
          {saving ? '保存中...' : '保存'}
        </button>
        <button onClick={load} style={btn(false)}>重置</button>
        {saved && <span style={{ fontSize: 12, color: 'var(--green, #3fb950)' }}>✓ 已保存</span>}
      </div>
    </div>
  )
}

// ─── Tab 2: Slash Commands ────────────────────────────────────────────────────
function CommandsTab({ projects }) {
  const [projectId, setProjectId] = useState('')
  const [commands, setCommands] = useState([])
  const [editor, setEditor] = useState(null)  // null | 'new' | cmd对象
  const [expanded, setExpanded] = useState(null)

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

  function CommandEditor({ cmd, onClose }) {
    const [name, setName] = useState(cmd?.name || '')
    const [description, setDescription] = useState(cmd?.description || '')
    const [content, setContent] = useState(cmd?.content || '')
    const [scope, setScope] = useState(cmd?.scope || 'global')
    const [saving, setSaving] = useState(false)

    async function save() {
      if (!name.trim()) return alert('命令名不能为空')
      setSaving(true)
      const url = cmd ? `/api/commands/${encodeURIComponent(cmd.file)}` : '/api/commands'
      const method = cmd ? 'PUT' : 'POST'
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, projectId: scope === 'project' ? projectId : undefined, name, description, content })
      })
      setSaving(false); onClose(); load()
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
          </div>
          <div>
            <div style={label}>命令名（不含 /）</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="my-command"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', fontFamily: 'monospace' }} autoFocus />
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

  const pluginCmds = commands.filter(c => c.scope === 'plugin')
  const globalCmds = commands.filter(c => c.scope === 'global')
  const projectCmds = commands.filter(c => c.scope === 'project')

  function CmdList({ cmds, title, readonly }) {
    if (!cmds.length) return null
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{title}（{cmds.length}）</div>
        {cmds.map(cmd => (
          <div key={`${cmd.scope}-${cmd.file}`} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 6, overflow: 'hidden' }}>
            <div onClick={() => setExpanded(expanded === `${cmd.scope}-${cmd.file}` ? null : `${cmd.scope}-${cmd.file}`)}
              style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>/{cmd.name}</span>
              {cmd.description && <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cmd.description}</span>}
              {!readonly && <>
                <button onClick={e => { e.stopPropagation(); setEditor(cmd) }} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>编辑</button>
                <button onClick={e => { e.stopPropagation(); handleDelete(cmd) }} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>删除</button>
              </>}
              {readonly && <span style={{ fontSize: 10, color: 'var(--text2)', padding: '1px 5px', borderRadius: 3, background: 'var(--bg3)' }}>只读</span>}
              <span style={{ fontSize: 10, color: 'var(--text2)' }}>{expanded === `${cmd.scope}-${cmd.file}` ? '▲' : '▼'}</span>
            </div>
            {expanded === `${cmd.scope}-${cmd.file}` && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--bg3)', fontFamily: 'monospace', lineHeight: 1.6 }}>
                {cmd.content || <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>（无内容）</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
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

      {editor && <CommandEditor cmd={editor === 'new' ? null : editor} onClose={() => setEditor(null)} />}
    </div>
  )
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function PromptsToolsPage() {
  const [tab, setTab] = useState('prompt')
  const [projects, setProjects] = useState([])

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects)
  }, [])

  const tabs = [
    { key: 'prompt', label: 'CLAUDE.md' },
    { key: 'commands', label: 'Slash Commands' },
  ]

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>全局提示词与命令</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>管理全局 CLAUDE.md 和自定义 Slash Commands</div>

      {/* Tab 栏 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '7px 16px', fontSize: 13, background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1, color: tab === t.key ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer'
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'prompt' && <PromptTab />}
      {tab === 'commands' && <CommandsTab projects={projects} />}
    </div>
  )
}
