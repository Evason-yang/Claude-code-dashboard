import React, { useEffect, useState } from 'react'

export default function ClaudeMdTab({ project, refreshKey }) {
  const [content, setContent] = useState('')
  const [data, setData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function load() {
    fetch(`/api/prompts?scope=project&projectId=${project.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setContent(d.content || '') })
  }

  useEffect(() => { load() }, [project.id, refreshKey])

  async function save() {
    setSaving(true)
    await fetch('/api/prompts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'project', projectId: project.id, content })
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
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="在此编写项目级 CLAUDE.md 内容（Markdown 格式，作为 system prompt 注入到每次对话）..."
        style={{
          width: '100%', minHeight: 400, padding: '12px 14px', fontSize: 13,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
          color: 'var(--text)', fontFamily: 'monospace', lineHeight: 1.7, resize: 'vertical'
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <button onClick={save} disabled={saving} style={{ padding: '6px 16px', fontSize: 13, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
          {saving ? '保存中...' : '保存'}
        </button>
        <button onClick={load} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer' }}>重置</button>
        {saved && <span style={{ fontSize: 12, color: '#3fb950' }}>✓ 已保存</span>}
      </div>
    </div>
  )
}
