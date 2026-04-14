import React, { useState } from 'react'
import { useToast } from './Toast.jsx'

const TYPE_COLORS = {
  user:      '#58a6ff',
  feedback:  '#f0883e',
  project:   '#3fb950',
  reference: '#d2a8ff',
}

const TYPES = ['user', 'feedback', 'project', 'reference']

export default function MemoryEditor({ projectId, memory, onClose, onSaved }) {
  const isEdit = !!memory
  const [name, setName] = useState(memory?.name || '')
  const [type, setType] = useState(memory?.type || 'user')
  const [description, setDescription] = useState(memory?.description || '')
  const [content, setContent] = useState(memory?.content || '')
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  async function handleSave() {
    if (!name.trim()) return showToast('标题不能为空', 'error')
    setSaving(true)
    const url = isEdit
      ? `/api/projects/${projectId}/memories/${encodeURIComponent(memory.file)}`
      : `/api/projects/${projectId}/memories`
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), type, description: description.trim(), content })
    })
    setSaving(false)
    if (res.ok) { showToast(isEdit ? '记忆已保存' : '记忆已创建', 'success'); onSaved(); onClose() }
    else showToast('保存失败', 'error')
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, width: 520, maxWidth: '92vw', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{isEdit ? '编辑记忆' : '新建记忆'}</div>

        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>标题</div>
          <input
            style={{ width: '100%', padding: '7px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)' }}
            value={name} onChange={e => setName(e.target.value)} placeholder="记忆名称" autoFocus
          />
        </div>

        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>类型</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {TYPES.map(t => {
              const color = TYPE_COLORS[t]
              const active = type === t
              return (
                <button key={t} onClick={() => setType(t)} style={{
                  padding: '5px 12px', fontSize: 12, borderRadius: 5, cursor: 'pointer', fontWeight: 500,
                  border: `1px solid ${active ? color : 'var(--border)'}`,
                  background: active ? `${color}22` : 'var(--bg2)',
                  color: active ? color : 'var(--text2)'
                }}>{t}</button>
              )
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>摘要描述</div>
          <input
            style={{ width: '100%', padding: '7px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)' }}
            value={description} onChange={e => setDescription(e.target.value)} placeholder="一句话描述这条记忆的用途"
          />
        </div>

        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>内容</div>
          <textarea
            style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', resize: 'vertical', minHeight: 140, fontFamily: 'inherit', lineHeight: 1.6 }}
            value={content} onChange={e => setContent(e.target.value)} placeholder="记忆正文..."
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 16px', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg2)', color: 'var(--text)' }}>取消</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '7px 16px', fontSize: 13, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff' }}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
