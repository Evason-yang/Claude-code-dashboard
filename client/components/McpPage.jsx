import React, { useEffect, useState } from 'react'
import { useToast } from './Toast.jsx'
import PathBadge from './PathBadge.jsx'

function McpEditor({ server, scope, projectId, projects, onClose, onSaved, onError, onSuccess }) {
  const isEdit = !!server
  const [name, setName] = useState(server?.name || '')
  const [type, setType] = useState(server?.url ? 'http' : 'stdio')
  const [command, setCommand] = useState(server?.command || '')
  const [args, setArgs] = useState(server ? (server.args || []).join(' ') : '')
  const [url, setUrl] = useState(server?.url || '')
  const [envText, setEnvText] = useState(server?.env ? Object.entries(server.env).map(([k,v]) => `${k}=${v}`).join('\n') : '')
  const [selScope, setSelScope] = useState(scope || 'global')
  const [selProjectId, setSelProjectId] = useState(projectId || '')
  const [saving, setSaving] = useState(false)

  function parseEnv(text) {
    const env = {}
    for (const line of text.split('\n')) {
      const idx = line.indexOf('=')
      if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
    return env
  }

  async function save() {
    if (!name.trim()) return onError('名称不能为空')
    setSaving(true)
    const body = {
      scope: selScope,
      projectId: selScope === 'project' ? selProjectId : undefined,
      name: name.trim(),
      ...(type === 'http' ? { url } : {
        command,
        args: args.trim() ? args.trim().split(/\s+/) : []
      }),
      env: parseEnv(envText)
    }
    const url2 = isEdit ? `/api/mcp/${encodeURIComponent(server.name)}` : '/api/mcp'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url2, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { onSuccess(isEdit ? 'MCP Server 已保存' : 'MCP Server 已添加'); onSaved(); onClose() }
    else onError('保存失败')
  }

  const lbl = { fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }
  const inp = { width: '100%', padding: '7px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, width: 540, maxWidth: '92vw', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{isEdit ? '编辑 MCP Server' : '添加 MCP Server'}</div>

        {!isEdit && (
          <div>
            <div style={lbl}>范围</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['global', 'project'].map(s => (
                <button key={s} onClick={() => setSelScope(s)} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 5, cursor: 'pointer', border: `1px solid ${selScope===s ? 'var(--accent)' : 'var(--border)'}`, background: selScope===s ? 'var(--accent)22' : 'var(--bg2)', color: selScope===s ? 'var(--accent)' : 'var(--text2)' }}>
                  {s === 'global' ? '全局' : '项目级'}
                </button>
              ))}
            </div>
            {selScope === 'project' && (
              <select value={selProjectId} onChange={e => setSelProjectId(e.target.value)}
                style={{ ...inp, marginTop: 6 }}>
                <option value="">选择项目...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
        )}

        <div>
          <div style={lbl}>名称</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="my-server" disabled={isEdit}
            style={{ ...inp, fontFamily: 'monospace', opacity: isEdit ? 0.6 : 1 }} autoFocus={!isEdit} />
        </div>

        <div>
          <div style={lbl}>类型</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['stdio', 'http'].map(t => (
              <button key={t} onClick={() => setType(t)} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 5, cursor: 'pointer', border: `1px solid ${type===t ? 'var(--accent)' : 'var(--border)'}`, background: type===t ? 'var(--accent)22' : 'var(--bg2)', color: type===t ? 'var(--accent)' : 'var(--text2)' }}>
                {t === 'stdio' ? 'stdio（命令行）' : 'HTTP/SSE'}
              </button>
            ))}
          </div>
        </div>

        {type === 'stdio' ? (
          <>
            <div>
              <div style={lbl}>命令</div>
              <input value={command} onChange={e => setCommand(e.target.value)} placeholder="npx 或 node 或 python"
                style={{ ...inp, fontFamily: 'monospace' }} />
            </div>
            <div>
              <div style={lbl}>参数（空格分隔）</div>
              <input value={args} onChange={e => setArgs(e.target.value)} placeholder="-y @modelcontextprotocol/server-filesystem /path"
                style={{ ...inp, fontFamily: 'monospace' }} />
            </div>
          </>
        ) : (
          <div>
            <div style={lbl}>URL</div>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="http://localhost:3001/sse"
              style={{ ...inp, fontFamily: 'monospace' }} />
          </div>
        )}

        <div>
          <div style={lbl}>环境变量（每行 KEY=VALUE，可选）</div>
          <textarea value={envText} onChange={e => setEnvText(e.target.value)} placeholder="API_KEY=xxx&#10;BASE_URL=https://..."
            style={{ ...inp, minHeight: 70, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 14px', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer' }}>取消</button>
          <button onClick={save} disabled={saving} style={{ padding: '7px 14px', fontSize: 13, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ServerCard({ server, onEdit, onDelete }) {
  const isHttp = !!server.url
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: 'var(--text)' }}>{server.name}</span>
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: isHttp ? 'var(--accent)22' : 'var(--bg3)', color: isHttp ? 'var(--accent)' : 'var(--text2)', border: `1px solid ${isHttp ? 'var(--accent)44' : 'var(--border)'}` }}>
              {isHttp ? 'HTTP' : 'stdio'}
            </span>
          </div>
          {isHttp
            ? <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'monospace' }}>{server.url}</div>
            : <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'monospace' }}>
                {server.command} {(server.args || []).join(' ')}
              </div>
          }
          {server.env && Object.keys(server.env).length > 0 && (
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text2)' }}>
              ENV: {Object.keys(server.env).join(', ')}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}>编辑</button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}>删除</button>
        </div>
      </div>
    </div>
  )
}

export default function McpPage() {
  const [data, setData] = useState({ global: [], project: [] })
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState(null)  // null | 'new' | server对象
  const { showToast } = useToast()

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(ps => {
      setProjects(ps)
    })
  }, [])

  function load() {
    setLoading(true)
    const params = projectId ? `?projectId=${projectId}` : ''
    fetch(`/api/mcp${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }

  useEffect(() => { load() }, [projectId])

  async function handleDelete(server) {
    if (!window.confirm(`删除 MCP Server「${server.name}」？`)) return
    const params = new URLSearchParams({ scope: server.scope })
    if (server.scope === 'project' && projectId) params.set('projectId', projectId)
    const res = await fetch(`/api/mcp/${encodeURIComponent(server.name)}?${params}`, { method: 'DELETE' })
    if (res.ok) showToast(`已删除「${server.name}」`, 'success')
    else showToast('删除失败', 'error')
    load()
  }

  const allServers = [...data.global, ...data.project]

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>MCP 管理</div>
        <button onClick={load} title="刷新" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}>↻</button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>管理 Model Context Protocol 服务器</div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <PathBadge path="~/.claude.json" label="~/.claude.json（全局）" />
        <PathBadge path="<project>/.claude/settings.local.json" label="<project>/.claude/settings.local.json（项目级）" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <select value={projectId} onChange={e => setProjectId(e.target.value)}
          style={{ padding: '5px 8px', fontSize: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)' }}>
          <option value="">仅全局</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}（含项目级）</option>)}
        </select>
        <button onClick={() => setEditor('new')} style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 12, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
          + 添加 Server
        </button>
      </div>

      {loading ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div> : (
        <>
          {data.global.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>全局（{data.global.length}）</div>
              {data.global.map(s => (
                <ServerCard key={s.name} server={s} onEdit={() => setEditor(s)} onDelete={() => handleDelete(s)} />
              ))}
            </div>
          )}
          {data.project.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>项目级（{data.project.length}）</div>
              {data.project.map(s => (
                <ServerCard key={s.name} server={s} onEdit={() => setEditor(s)} onDelete={() => handleDelete(s)} />
              ))}
            </div>
          )}
          {allServers.length === 0 && (
            <div style={{ color: 'var(--text2)', fontSize: 13 }}>
              暂无 MCP Server，点击「添加 Server」开始配置
            </div>
          )}
        </>
      )}

      {editor && (
        <McpEditor
          server={editor === 'new' ? null : editor}
          scope={editor === 'new' ? 'global' : editor.scope}
          projectId={projectId}
          projects={projects}
          onClose={() => setEditor(null)}
          onSaved={load}
          onError={msg => showToast(msg, 'error')}
          onSuccess={msg => showToast(msg, 'success')}
        />
      )}
    </div>
  )
}
