import React, { useEffect, useState } from 'react'

const S = {
  page: { flex: 1, overflow: 'auto', padding: 24 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'var(--text2)', marginBottom: 20 },
  installRow: { display: 'flex', gap: 8, marginBottom: 20 },
  input: { flex: 1, padding: '7px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)' },
  btn: { padding: '7px 14px', fontSize: 13, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' },
  pluginCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
  pluginHeader: { padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg3)' },
  pluginName: { fontSize: 14, fontWeight: 600, flex: 1 },
  pluginMeta: { fontSize: 11, color: 'var(--text2)' },
  toggle: { padding: '4px 12px', fontSize: 12, borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg2)', color: 'var(--text)' },
  toggleOn: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },
  skillGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1 },
  skillItem: { padding: '8px 16px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' },
  skillName: { fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 2, fontFamily: 'monospace' },
  skillDesc: { fontSize: 11, color: 'var(--text2)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  empty: { color: 'var(--text2)', fontSize: 13 },
}

export default function SkillsPage() {
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [installInput, setInstallInput] = useState('')
  const [installing, setInstalling] = useState(false)

  function load() {
    fetch('/api/skills').then(r => r.json()).then(d => { setPlugins(d); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function togglePlugin(plugin) {
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
    const source = val.startsWith('http') ? 'url' : 'path'
    const res = await fetch('/api/skills/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, value: val })
    })
    setInstalling(false)
    if (res.ok) { setInstallInput(''); load() }
    else alert('安装失败，请检查路径或 URL')
  }

  if (loading) return <div style={S.page}><div style={S.empty}>加载中...</div></div>

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={S.title}>Skill 管理</div>
        <button onClick={load} title="刷新" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}>↻</button>
      </div>
      <div style={S.subtitle}>管理 Claude Code 已安装的技能插件</div>

      <div style={S.installRow}>
        <input
          style={S.input}
          placeholder="输入本地路径或 URL 安装新插件"
          value={installInput}
          onChange={e => setInstallInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && installSkill()}
        />
        <button style={S.btn} onClick={installSkill} disabled={installing}>
          {installing ? '安装中...' : '安装'}
        </button>
      </div>

      {plugins.length === 0
        ? <div style={S.empty}>未发现已安装的插件</div>
        : plugins.map(plugin => (
            <div key={plugin.id} style={S.pluginCard}>
              <div style={S.pluginHeader}>
                <div style={S.pluginName}>{plugin.name}</div>
                <div style={S.pluginMeta}>v{plugin.version} · {plugin.skillCount} 个 skill</div>
                <button
                  style={{ ...S.toggle, ...(plugin.enabled ? S.toggleOn : {}) }}
                  onClick={() => togglePlugin(plugin)}
                >
                  {plugin.enabled ? '已启用' : '已禁用'}
                </button>
              </div>
              {plugin.skills.length > 0 && (
                <div style={S.skillGrid}>
                  {plugin.skills.map(s => (
                    <div key={s.id} style={{ ...S.skillItem, opacity: plugin.enabled ? 1 : 0.4 }}>
                      <div style={S.skillName}>{s.name}</div>
                      {s.description && <div style={S.skillDesc}>{s.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
      }
    </div>
  )
}
