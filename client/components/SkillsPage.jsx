import React, { useEffect, useState, useMemo } from 'react'
import { useToast } from './Toast.jsx'
import { marked } from 'marked'

export default function SkillsPage() {
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [installInput, setInstallInput] = useState('')
  const [installing, setInstalling] = useState(false)
  const [selected, setSelected] = useState(null)   // { skill, plugin }
  const [fileContent, setFileContent] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mdPreview, setMdPreview] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')  // 'all' | 'local' | 'plugin'
  const { showToast } = useToast()

  function load() {
    fetch('/api/skills').then(r => r.json()).then(d => { setPlugins(d); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // 把所有 skill 拍平，带插件信息
  const allSkills = useMemo(() => {
    const list = []
    for (const plugin of plugins) {
      for (const skill of plugin.skills) {
        list.push({ skill, plugin })
      }
    }
    return list
  }, [plugins])

  // 筛选
  const filtered = useMemo(() => {
    let list = allSkills
    if (tab === 'local') list = list.filter(({ plugin }) => plugin.source === 'local')
    if (tab === 'plugin') list = list.filter(({ plugin }) => plugin.source === 'plugin')
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(({ skill }) =>
        skill.name.toLowerCase().includes(q) ||
        (skill.description || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [allSkills, tab, search])

  // 统计
  const counts = useMemo(() => ({
    all: allSkills.length,
    local: allSkills.filter(({ plugin }) => plugin.source === 'local').length,
    plugin: allSkills.filter(({ plugin }) => plugin.source === 'plugin').length,
  }), [allSkills])

  async function togglePlugin(pluginId, enabled, e) {
    e.stopPropagation()
    await fetch(`/api/skills/${encodeURIComponent(pluginId)}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    })
    load()
  }

  async function installSkill() {
    const val = installInput.trim()
    if (!val) return
    setInstalling(true)
    const isUrl = val.startsWith('http') || /^[\w.-]+\/[\w.-]+$/.test(val)
    const res = await fetch('/api/skills/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: isUrl ? 'url' : 'path', value: val })
    })
    setInstalling(false)
    if (res.ok) { showToast('安装成功', 'success'); setInstallInput(''); load() }
    else showToast('安装失败，请检查路径或 URL', 'error')
  }

  async function selectSkill(item) {
    setSelected(item)
    setEditing(false)
    const { skill } = item
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

      {/* ── 左侧 ── */}
      <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 标题 + 安装 */}
        <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Skill 管理</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={{ flex: 1, padding: '5px 8px', fontSize: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', outline: 'none' }}
              placeholder="路径 / GitHub URL 安装"
              value={installInput}
              onChange={e => setInstallInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && installSkill()}
            />
            <button onClick={installSkill} disabled={installing}
              style={{ padding: '5px 10px', fontSize: 12, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: installing ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: installing ? 0.6 : 1 }}>
              {installing ? '...' : '安装'}
            </button>
            <button onClick={load} title="刷新"
              style={{ padding: '5px 8px', fontSize: 13, background: 'none', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text2)', cursor: 'pointer' }}>↻</button>
          </div>
        </div>

        {/* Tab 切换 */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[['all', '全部', counts.all], ['local', '本地', counts.local], ['plugin', '插件', counts.plugin]].map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '7px 4px', fontSize: 12, background: 'none',
              border: 'none', borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`,
              color: tab === key ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer',
            }}>
              {label} <span style={{ fontSize: 10, opacity: 0.7 }}>{count}</span>
            </button>
          ))}
        </div>

        {/* 搜索框 */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索 skill 名称或描述..."
            style={{ width: '100%', padding: '5px 8px', fontSize: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* skill 列表 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 16, color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--text2)', fontSize: 13 }}>
              {search ? `无匹配结果「${search}」` : '暂无 Skill'}
            </div>
          ) : filtered.map(({ skill, plugin }) => {
            const isSelected = selected?.skill?.id === skill.id
            const isEnabled = plugin.enabled !== false
            return (
              <div
                key={skill.id}
                onClick={() => selectSkill({ skill, plugin })}
                style={{
                  padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                  background: isSelected ? 'var(--accent)11' : 'none',
                  borderLeft: `2px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                  opacity: isEnabled ? 1 : 0.45,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: isSelected ? 'var(--accent)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {skill.name}
                  </span>
                  {plugin.source === 'local' && (
                    <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: '#3fb95022', color: '#3fb950', flexShrink: 0 }}>本地</span>
                  )}
                  {!isEnabled && (
                    <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--bg3)', color: 'var(--text2)', flexShrink: 0 }}>禁用</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {plugin.name}{skill.description ? ` · ${skill.description.slice(0, 50)}` : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 右侧详情 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text2)' }}>
            <span style={{ fontSize: 24, opacity: 0.3 }}>◆</span>
            <span style={{ fontSize: 13 }}>选择左侧 Skill 查看详情</span>
          </div>
        ) : (
          <>
            {/* 工具栏 */}
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace', color: 'var(--accent)' }}>{selected.skill.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>{selected.plugin.name}</span>
                <span style={{ fontSize: 10, marginLeft: 6, padding: '1px 5px', borderRadius: 3,
                  background: selected.plugin.source === 'local' ? '#3fb95022' : 'var(--bg3)',
                  color: selected.plugin.source === 'local' ? '#3fb950' : 'var(--text2)' }}>
                  {selected.plugin.source === 'local' ? '本地' : '插件'}
                </span>
                {canEdit && <span style={{ fontSize: 10, marginLeft: 4, padding: '1px 5px', borderRadius: 3, background: '#58a6ff22', color: '#58a6ff' }}>可编辑</span>}
              </div>

              {/* 启用/禁用切换 */}
              <button
                onClick={e => togglePlugin(selected.plugin.id, !selected.plugin.enabled, e)}
                style={{ padding: '3px 10px', fontSize: 11, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', flexShrink: 0,
                  background: selected.plugin.enabled !== false ? 'var(--accent)' : 'var(--bg3)',
                  color: selected.plugin.enabled !== false ? '#fff' : 'var(--text2)' }}>
                {selected.plugin.enabled !== false ? '已启用' : '已禁用'}
              </button>

              {!editing && (
                <>
                  <button onClick={() => setMdPreview(p => !p)}
                    style={{ padding: '3px 9px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: mdPreview ? 'var(--accent)' : 'var(--bg3)', color: mdPreview ? '#fff' : 'var(--text2)', cursor: 'pointer' }}>
                    {mdPreview ? 'Markdown' : '源码'}
                  </button>
                  {canEdit && (
                    <button onClick={() => { setEditing(true); setEditContent(fileContent) }}
                      style={{ padding: '3px 9px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', cursor: 'pointer' }}>
                      编辑
                    </button>
                  )}
                </>
              )}
              {editing && (
                <>
                  <button onClick={saveFile} disabled={saving}
                    style={{ padding: '3px 12px', fontSize: 11, borderRadius: 4, border: 'none', background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    style={{ padding: '3px 9px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', cursor: 'pointer' }}>
                    取消
                  </button>
                </>
              )}
            </div>

            {/* 描述摘要 */}
            {selected.skill.description && !editing && (
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)', background: 'var(--bg2)', lineHeight: 1.5 }}>
                {selected.skill.description}
              </div>
            )}

            {/* 内容区 */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {fileContent === 'loading' && <div style={{ padding: 16, color: 'var(--text2)', fontSize: 13 }}>加载中...</div>}
              {fileContent && fileContent !== 'loading' && !editing && (
                mdPreview ? <MarkdownView content={fileContent} /> : <SourceView content={fileContent} />
              )}
              {editing && (
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} spellCheck={false}
                  style={{ width: '100%', height: '100%', padding: '14px 16px', fontSize: 12, fontFamily: 'ui-monospace, monospace', background: 'var(--bg)', border: 'none', color: 'var(--text)', resize: 'none', lineHeight: 1.65, outline: 'none', boxSizing: 'border-box' }} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MarkdownView({ content }) {
  const html = marked(content, { breaks: true, gfm: true })
  return (
    <>
      <div className="sk-md" dangerouslySetInnerHTML={{ __html: html }}
        style={{ padding: '20px 24px', fontSize: 13, lineHeight: 1.8, color: 'var(--text)', maxWidth: 820 }} />
      <style>{`
        .sk-md h1,.sk-md h2,.sk-md h3{color:var(--text);margin:1em 0 .4em;font-weight:600}
        .sk-md h1{font-size:1.5em;border-bottom:1px solid var(--border);padding-bottom:.3em}
        .sk-md h2{font-size:1.2em}
        .sk-md p{margin:.5em 0}
        .sk-md a{color:var(--accent)}
        .sk-md code{background:var(--bg3);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:.88em}
        .sk-md pre{background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:10px 14px;overflow-x:auto;margin:.6em 0}
        .sk-md pre code{background:none;padding:0}
        .sk-md blockquote{border-left:3px solid var(--accent);margin:.5em 0;padding:2px 12px;color:var(--text2);background:var(--bg2)}
        .sk-md ul,.sk-md ol{padding-left:1.5em;margin:.3em 0}
        .sk-md hr{border:none;border-top:1px solid var(--border);margin:1em 0}
        .sk-md table{border-collapse:collapse;width:100%;margin:.6em 0;font-size:12px}
        .sk-md th,.sk-md td{border:1px solid var(--border);padding:5px 10px;text-align:left}
        .sk-md th{background:var(--bg3);font-weight:600}
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
