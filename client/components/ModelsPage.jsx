import React, { useEffect, useState } from 'react'

const S = {
  page: { flex: 1, overflow: 'auto', padding: 24 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'var(--text2)', marginBottom: 20 },
  card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s' },
  cardActive: { borderColor: 'var(--accent)', background: 'var(--accent-bg)' },
  radio: { width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: 'var(--accent)' },
  radioDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' },
  modelInfo: { flex: 1 },
  modelName: { fontSize: 14, fontWeight: 600, marginBottom: 2 },
  modelDesc: { fontSize: 12, color: 'var(--text2)' },
  badge: { fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--bg3)', color: 'var(--text2)', flexShrink: 0 },
  badgeActive: { background: 'var(--accent)', color: '#fff' },
  saveBtn: { marginTop: 16, padding: '8px 20px', fontSize: 13, borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 500 },
  saveBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  notice: { marginTop: 12, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px' },
  success: { marginTop: 10, fontSize: 13, color: 'var(--green)' }
}

const MODEL_SPEED = {
  'claude-opus-4-6': '强',
  'claude-opus-4-6[1m]': '强 · 1M ctx',
  'claude-sonnet-4-6': '快',
  'claude-haiku-4-5': '最快',
}

export default function ModelsPage() {
  const [current, setCurrent] = useState(null)
  const [selected, setSelected] = useState(null)
  const [available, setAvailable] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function loadModels() {
    setLoading(true)
    fetch('/api/models')
      .then(r => r.json())
      .then(d => {
        setCurrent(d.current)
        setSelected(d.current)
        setAvailable(d.available)
        setLoading(false)
      })
  }

  useEffect(() => { loadModels() }, [])

  async function save() {
    if (selected === current) return
    setSaving(true)
    await fetch('/api/models', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: selected || '' })
    })
    setCurrent(selected)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div style={S.page}><div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div></div>

  const changed = selected !== current

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={S.title}>模型管理</div>
        <button onClick={loadModels} title="刷新" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}>↻</button>
      </div>
      <div style={S.subtitle}>选择 Claude Code 全局默认使用的模型</div>

      {available.map(m => {
        const isActive = selected === m.id
        return (
          <div
            key={m.id}
            style={{ ...S.card, ...(isActive ? S.cardActive : {}) }}
            onClick={() => setSelected(isActive ? null : m.id)}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <div style={{ ...S.radio, ...(isActive ? S.radioActive : {}) }}>
              {isActive && <div style={S.radioDot} />}
            </div>
            <div style={S.modelInfo}>
              <div style={S.modelName}>{m.label}</div>
              <div style={S.modelDesc}>{m.desc}</div>
            </div>
            <div style={{ ...S.badge, ...(isActive ? S.badgeActive : {}) }}>
              {MODEL_SPEED[m.id] || ''}
            </div>
            {m.id === current && !isActive && (
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>当前</div>
            )}
          </div>
        )
      })}

      <button
        style={{ ...S.saveBtn, ...((!changed || saving) ? S.saveBtnDisabled : {}) }}
        onClick={save}
        disabled={!changed || saving}
      >
        {saving ? '保存中...' : '保存设置'}
      </button>

      {saved && <div style={S.success}>✓ 已保存，下次启动 Claude Code 时生效</div>}

      <div style={S.notice}>
        此设置写入 <code>~/.claude/settings.json</code> 的 <code>model</code> 字段，对所有 Claude Code 会话生效。修改后需重启 Claude Code 才能生效。
      </div>
    </div>
  )
}
