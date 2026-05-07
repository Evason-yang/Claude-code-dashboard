import React, { useEffect, useState } from 'react'
import { useToast } from './Toast.jsx'
import { marked } from 'marked'

export default function SkillsPage() {
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [installInput, setInstallInput] = useState('')
  const [installing, setInstalling] = useState(false)
  const [selected, setSelected] = useState(null)   // { skill, plugin }
  const [fileContent, setFileContent] = useState(null)  // null | 'loading' | string
  const [editContent, setEditContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mdPreview, setMdPreview] = useState(true)
  const { showToast } = useToast()

  function load() {
    fetch('/api/skills').then(r => r.json()).then(d => { setPlugins(d); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function togglePlugin(plugin, e) {
    e.stopPropagation()
    await fetch(`/api/skills/${encodeURIComponent(plugin.id)}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !plugin.enabled })
    })
    load()
  }

  async function installSkill() {
    const val = installInput.trim()
    if (!val) return
    setInstalling(true)
    const isUrl = val.startsWith('http') || /^[\w.-]+\/[\w.-]+$/.test(val)
    const source = isUrl ? 'url' : 'path'
    const res = await fetch('/api/skills/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, value: val })
    })
    setInstalling(false)
    if (res.ok) { showToast('安装成功', 'success'); setInstallInput(''); load() }
    else showToast('安装失败，请检查路径或 URL', 'error')
  }

  async function selectSkill(skill, plugin) {
    setSelected({ skill, plugin })
    setEditing(false)
    if (!skill.filePath) { setFileContent('// 无法获取文件路径'); return }
    setFileContent('loading')
    const res = await fetch(`/api/skills/file?path=${encodeURIComponent(skill.filePath)}`)
    const data = await res.json()
    const content = data.error ? `// 读取失败：${data.error}` : data.content
    setFileContent(content)
    setEditContent(content)
  }

  async function saveFile() {
    if (!selected?.skill?.filePath) return
    setSaving(true)
    try {
      const res = await fetch('/api/skills/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selected.skill.filePath, content: editContent })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setFileContent(editContent)
      setEditing(false)
      showToast('已保存', 'success')
    } catch (e) {
      showToast(`保存失败：${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const canEdit = selected?.skill?.editable

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* ── 左侧：插件 + skill 列表 ── */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 安装栏 */}
        <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Skill 管理</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={{ flex: 1, padding: '5px 8px', fontSize: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', outline: 'none' }}
              placeholder="路径 / GitHub URL"
              value={installInput}
              onChange={e => setInstallInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && installSkill()}
            />
            <button
              onClick={installSkill} disabled={installing}
              style={{ padding: '5px 10px', fontSize: 12, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: installing ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: installing ? 0.6 : 1 }}
            >
              {installing ? '...' : '安装'}
            </button>
            <button onClick={load} title="刷新" style={{ padding: '5px 8px', fontSize: 13, background: 'none', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text2)', cursor: 'pointer' }}>↻</button>
          </div>
        </div>

        {/* 插件 + skill 列表 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 16, color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
          ) : plugins.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--text2)', fontSize: 13 }}>未发现已安装的插件</div>
          ) : plugins.map(plugin => (
            <PluginGroup
              key={plugin.id}
              plugin={plugin}
              selected={selected}
              onSelect={selectSkill}
              onToggle={togglePlugin}
            />
          ))}
        </div>
      </div>

      {/* ── 右侧：文件查看 / 编辑 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>
            选择左侧 Skill 查看内容
          </div>
        ) : (
          <>
            {/* 顶部工具栏 */}
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>{selected.skill.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>{selected.plugin.name}</span>
                {canEdit && <span style={{ fontSize: 10, color: '#3fb950', marginLeft: 8, padding: '1px 5px', background: '#3fb95022', borderRadius: 3 }}>可编辑</span>}
                {!canEdit && <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 8, padding: '1px 5px', background: 'var(--bg3)', borderRadius: 3 }}>只读</span>}
              </div>

              {!editing && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setMdPreview(p => !p)} style={{ padding: '3px 9px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: mdPreview ? 'var(--accent)' : 'var(--bg3)', color: mdPreview ? '#fff' : 'var(--text2)', cursor: 'pointer' }}>
                    {mdPreview ? 'Markdown' : '源码'}
                  </button>
                  {canEdit && (
                    <button onClick={() => { setEditing(true); setEditContent(fileContent) }} style={{ padding: '3px 9px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', cursor: 'pointer' }}>
                      编辑
                    </button>
                  )}
                </div>
              )}

              {editing && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={saveFile} disabled={saving} style={{ padding: '3px 12px', fontSize: 11, borderRadius: 4, border: 'none', background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button onClick={() => setEditing(false)} style={{ padding: '3px 10px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', cursor: 'pointer' }}>
                    取消
                  </button>
                </div>
              )}
            </div>

            {/* 内容区 */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {fileContent === 'loading' && (
                <div style={{ padding: 16, color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
              )}
              {fileContent && fileContent !== 'loading' && !editing && (
                mdPreview
                  ? <MarkdownView content={fileContent} />
                  : <SourceView content={fileContent} />
              )}
              {editing && (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  spellCheck={false}
                  style={{ width: '100%', height: '100%', padding: '14px 16px', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', background: 'var(--bg)', border: 'none', color: 'var(--text)', resize: 'none', lineHeight: 1.65, outline: 'none', boxSizing: 'border-box' }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── 子组件 ──────────────────────────────────────────────────────────────────

function PluginGroup({ plugin, selected, onSelect, onToggle }) {
  const [open, setOpen] = useState(plugin.source === 'local' || plugin.skills.length <= 6)

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      {/* 插件头 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'var(--bg2)', userSelect: 'none' }}
      >
        <span style={{ fontSize: 9, color: 'var(--text2)', width: 10 }}>{open ? '▼' : '▶'}</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plugin.name}</span>
        <span style={{ fontSize: 10, color: 'var(--text2)', flexShrink: 0 }}>{plugin.skillCount}</span>
        <button
          onClick={e => onToggle(plugin, e)}
          style={{ padding: '2px 7px', fontSize: 10, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', flexShrink: 0, background: plugin.enabled ? 'var(--accent)' : 'var(--bg3)', color: plugin.enabled ? '#fff' : 'var(--text2)' }}
        >
          {plugin.enabled ? '启用' : '禁用'}
        </button>
      </div>

      {/* skill 列表 */}
      {open && plugin.skills.map(skill => {
        const isSelected = selected?.skill?.id === skill.id
        return (
          <div
            key={skill.id}
            onClick={() => onSelect(skill, plugin)}
            style={{
              padding: '5px 12px 5px 24px', cursor: 'pointer', fontSize: 12,
              background: isSelected ? 'var(--accent)22' : 'none',
              borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
              color: isSelected ? 'var(--accent)' : plugin.enabled ? 'var(--text)' : 'var(--text2)',
              opacity: plugin.enabled ? 1 : 0.5,
            }}
          >
            <div style={{ fontFamily: 'monospace', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {skill.name}
            </div>
            {skill.description && (
              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {skill.description}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MarkdownView({ content }) {
  const html = marked(content, { breaks: true, gfm: true })
  return (
    <>
      <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} style={{ padding: '20px 24px', fontSize: 13, lineHeight: 1.8, color: 'var(--text)', maxWidth: 820 }} />
      <style>{`
        .md-preview h1,.md-preview h2,.md-preview h3 { color:var(--text); margin:1em 0 .4em; font-weight:600 }
        .md-preview h1 { font-size:1.5em; border-bottom:1px solid var(--border); padding-bottom:.3em }
        .md-preview h2 { font-size:1.2em }
        .md-preview p { margin:.5em 0 }
        .md-preview a { color:var(--accent) }
        .md-preview code { background:var(--bg3); padding:1px 5px; border-radius:3px; font-family:monospace; font-size:.88em }
        .md-preview pre { background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:10px 14px; overflow-x:auto; margin:.6em 0 }
        .md-preview pre code { background:none; padding:0 }
        .md-preview blockquote { border-left:3px solid var(--accent); margin:.5em 0; padding:2px 12px; color:var(--text2); background:var(--bg2) }
        .md-preview ul,.md-preview ol { padding-left:1.5em; margin:.3em 0 }
        .md-preview hr { border:none; border-top:1px solid var(--border); margin:1em 0 }
      `}</style>
    </>
  )
}

function SourceView({ content }) {
  const lines = content.split('\n')
  return (
    <div style={{ display: 'flex', fontFamily: 'ui-monospace, monospace', fontSize: 12, lineHeight: 1.65 }}>
      <div style={{ padding: '14px 10px 14px 14px', textAlign: 'right', color: 'var(--text2)', userSelect: 'none', borderRight: '1px solid var(--border)', minWidth: 44, flexShrink: 0, opacity: 0.4 }}>
        {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <pre style={{ margin: 0, padding: '14px 16px', flex: 1, overflow: 'visible', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text)' }}>
        {content}
      </pre>
    </div>
  )
}
