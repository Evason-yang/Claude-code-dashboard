import React, { useEffect, useState } from 'react'
import PathBadge from './PathBadge.jsx'

export default function GlobalPromptPage() {
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
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>全局 CLAUDE.md</div>
        <button onClick={load} title="刷新" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}>↻</button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
        作为 system prompt 注入到每次对话，对所有项目生效
      </div>
      {data && (
        <div style={{ marginBottom: 16 }}>
          <PathBadge path={data.path} exists={data.exists} />
        </div>
      )}

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="在此输入全局 CLAUDE.md 内容（Markdown 格式）..."
        style={{
          width: '100%', minHeight: 420, padding: '12px 14px', fontSize: 13,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
          color: 'var(--text)', fontFamily: 'monospace', lineHeight: 1.7, resize: 'vertical'
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <button onClick={save} disabled={saving} style={{ padding: '7px 18px', fontSize: 13, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
          {saving ? '保存中...' : '保存'}
        </button>
        <button onClick={load} style={{ padding: '7px 14px', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer' }}>重置</button>
        {saved && <span style={{ fontSize: 12, color: '#3fb950' }}>✓ 已保存</span>}
      </div>
    </div>
  )
}
