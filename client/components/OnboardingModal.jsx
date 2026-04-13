import React, { useState } from 'react'

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, width: 440, maxWidth: '90vw' },
  title: { fontSize: 16, fontWeight: 600, marginBottom: 8 },
  desc: { fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 },
  input: { width: '100%', padding: '8px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', marginBottom: 8 },
  row: { display: 'flex', gap: 8, marginTop: 8 },
  btn: { flex: 1, padding: '8px 0', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg2)', color: 'var(--text)' },
  btnPrimary: { background: 'var(--accent)', color: '#fff', border: 'none' },
  dirs: { marginBottom: 8 },
  dirItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'var(--bg2)', borderRadius: 4, marginBottom: 4, fontSize: 12 },
  removeBtn: { background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12 }
}

export default function OnboardingModal({ onClose }) {
  const [dirs, setDirs] = useState([])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  function addDir() {
    const d = input.trim()
    if (d && !dirs.includes(d)) setDirs(prev => [...prev, d])
    setInput('')
  }

  async function save() {
    if (dirs.length === 0) return alert('请至少添加一个扫描目录')
    setSaving(true)
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanDirs: dirs, manualProjects: [] })
    })
    setSaving(false)
    onClose()
  }

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.title}>欢迎使用 Claude Code 项目管理器</div>
        <div style={S.desc}>请添加要扫描的目录。工具会自动发现其中包含 .claude/ 文件夹的项目。</div>
        <div style={S.dirs}>
          {dirs.map(d => (
            <div key={d} style={S.dirItem}>
              <span>{d}</span>
              <button style={S.removeBtn} onClick={() => setDirs(prev => prev.filter(x => x !== d))}>移除</button>
            </div>
          ))}
        </div>
        <input
          style={S.input}
          placeholder="输入目录路径，如 /Users/yourname/Projects"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addDir()}
        />
        <button style={{ ...S.btn, marginBottom: 8 }} onClick={addDir}>+ 添加目录</button>
        <div style={S.row}>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={save} disabled={saving}>
            {saving ? '保存中...' : '开始使用'}
          </button>
        </div>
      </div>
    </div>
  )
}
