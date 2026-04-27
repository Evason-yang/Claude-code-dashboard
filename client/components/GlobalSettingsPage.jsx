import React, { useEffect, useState } from 'react'
import { useToast } from './Toast.jsx'

const AVAILABLE_MODELS = [
  { id: 'claude-opus-4-6',      label: 'Claude Opus 4.6' },
  { id: 'claude-opus-4-6[1m]',  label: 'Claude Opus 4.6 (1M)' },
  { id: 'claude-sonnet-4-6',    label: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5',     label: 'Claude Haiku 4.5' },
]

const PERMISSION_MODES = [
  { id: 'auto',         label: 'auto',         desc: '自动批准低风险操作' },
  { id: 'default',      label: 'default',       desc: '需要确认大多数操作' },
  { id: 'acceptEdits',  label: 'acceptEdits',   desc: '自动接受文件编辑' },
  { id: 'bypassPermissions', label: 'bypassPermissions', desc: '跳过所有权限检查' },
]

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, desc, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [rawMode, setRawMode] = useState(false)
  const [rawText, setRawText] = useState('')
  const [rawError, setRawError] = useState('')
  const { showToast } = useToast()

  async function load() {
    const res = await fetch('/api/settings')
    const data = await res.json()
    setSettings(data)
    setRawText(JSON.stringify(data, null, 2))
  }

  useEffect(() => { load() }, [])

  async function save(updates) {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await load()
      showToast('已保存', 'success')
    } catch (e) {
      showToast(`保存失败：${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveRaw() {
    setRawError('')
    let parsed
    try { parsed = JSON.parse(rawText) } catch (e) { setRawError(`JSON 格式错误：${e.message}`); return }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await load()
      showToast('已保存', 'success')
      setRawMode(false)
    } catch (e) {
      showToast(`保存失败：${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  function patch(key, value) {
    save({ [key]: value })
  }

  if (!settings) return <div style={{ padding: 24, color: 'var(--text2)', fontSize: 13 }}>加载中...</div>

  const permMode = settings.permissions?.defaultMode || 'default'
  const model = settings.model || 'claude-opus-4-6'
  const skipPrompt = settings.skipAutoPermissionPrompt || false

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24, maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>全局配置</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>~/.claude/settings.json</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => { setRawMode(m => !m); setRawError('') }} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 5, border: '1px solid var(--border)', background: rawMode ? 'var(--accent)' : 'var(--bg2)', color: rawMode ? '#fff' : 'var(--text)', cursor: 'pointer' }}>
            {rawMode ? '表单模式' : '原始 JSON'}
          </button>
          <button onClick={load} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer' }}>↻ 刷新</button>
        </div>
      </div>

      {rawMode ? (
        <div>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            spellCheck={false}
            style={{ width: '100%', minHeight: 480, padding: 14, fontSize: 12, fontFamily: 'ui-monospace, monospace', background: 'var(--bg2)', border: `1px solid ${rawError ? '#f85149' : 'var(--border)'}`, borderRadius: 8, color: 'var(--text)', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', outline: 'none' }}
          />
          {rawError && <div style={{ color: '#f85149', fontSize: 12, marginTop: 6 }}>{rawError}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={saveRaw} disabled={saving} style={{ padding: '6px 18px', fontSize: 13, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? '保存中...' : '保存'}
            </button>
            <button onClick={() => { setRawMode(false); setRawError('') }} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      ) : (
        <>
          {/* 模型 */}
          <Section title="默认模型">
            <Row label="全局默认模型" desc="新会话使用的模型，可在项目级覆盖">
              <select
                value={model}
                onChange={e => patch('model', e.target.value)}
                style={{ padding: '5px 10px', fontSize: 13, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', cursor: 'pointer' }}
              >
                {AVAILABLE_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Row>
          </Section>

          {/* 权限 */}
          <Section title="权限设置">
            <Row label="默认权限模式" desc="控制 Claude Code 执行操作时的确认行为">
              <select
                value={permMode}
                onChange={e => patch('permissions', { ...settings.permissions, defaultMode: e.target.value })}
                style={{ padding: '5px 10px', fontSize: 13, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', cursor: 'pointer' }}
              >
                {PERMISSION_MODES.map(m => <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>)}
              </select>
            </Row>
            <Row label="跳过自动权限提示" desc="启用后不再弹出权限确认对话框">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={skipPrompt}
                  onChange={e => patch('skipAutoPermissionPrompt', e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: 13, color: skipPrompt ? 'var(--accent)' : 'var(--text2)' }}>
                  {skipPrompt ? '已启用' : '未启用'}
                </span>
              </label>
            </Row>
          </Section>

          {/* 状态栏 */}
          {settings.statusLine && (
            <Section title="状态栏 (statusLine)">
              <Row label="类型" desc="状态栏数据来源类型">
                <code style={{ fontSize: 12, background: 'var(--bg3)', padding: '3px 8px', borderRadius: 4, color: 'var(--text)' }}>
                  {settings.statusLine.type || '—'}
                </code>
              </Row>
              {settings.statusLine.command && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>命令</div>
                  <textarea
                    defaultValue={settings.statusLine.command}
                    onBlur={e => patch('statusLine', { ...settings.statusLine, command: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 11, fontFamily: 'ui-monospace, monospace', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', resize: 'vertical', minHeight: 72, lineHeight: 1.5, boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              )}
            </Section>
          )}

          {/* 其他字段（只读展示） */}
          <Section title="其他配置（只读）">
            {['enabledPlugins', 'extraKnownMarketplaces'].filter(k => settings[k]).map(k => (
              <Row key={k} label={k} desc="通过插件管理页修改">
                <code style={{ fontSize: 11, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 3, color: 'var(--text2)' }}>
                  {typeof settings[k] === 'object' ? `${Object.keys(settings[k]).length} 项` : String(settings[k])}
                </code>
              </Row>
            ))}
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
              如需编辑所有字段，请切换到「原始 JSON」模式。
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
