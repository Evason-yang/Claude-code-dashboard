import React, { useEffect, useState } from 'react'
import { useToast } from './Toast.jsx'
import PathBadge from './PathBadge.jsx'

const HOOK_EVENTS = ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop', 'Notification']

const EVENT_DESC = {
  SessionStart: '会话开始时触发',
  PreToolUse: '工具调用前触发，可用于拦截',
  PostToolUse: '工具调用后触发',
  Stop: '会话结束时触发',
  Notification: '收到通知时触发',
}

function RuleEditor({ rule, onSave, onClose }) {
  const [matcher, setMatcher] = useState(rule?.matcher || '')
  const [command, setCommand] = useState(rule?.hooks?.[0]?.command || '')
  const [isAsync, setIsAsync] = useState(rule?.hooks?.[0]?.async ?? false)
  const lbl = { fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }
  const inp = { width: '100%', padding: '7px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)' }

  function save() {
    if (!command.trim()) return alert('命令不能为空')
    onSave({ matcher: matcher.trim() || undefined, hooks: [{ type: 'command', command: command.trim(), async: isAsync }] })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, width: 500, maxWidth: '92vw', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{rule ? '编辑 Hook' : '添加 Hook'}</div>
        <div>
          <div style={lbl}>匹配器（可选，正则，为空则匹配所有）</div>
          <input value={matcher} onChange={e => setMatcher(e.target.value)} placeholder="如 Bash|Write 或留空匹配所有"
            style={{ ...inp, fontFamily: 'monospace' }} />
        </div>
        <div>
          <div style={lbl}>执行命令</div>
          <input value={command} onChange={e => setCommand(e.target.value)} placeholder="如 echo $TOOL_NAME 或 /path/to/script.sh"
            style={{ ...inp, fontFamily: 'monospace' }} autoFocus />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="async" checked={isAsync} onChange={e => setIsAsync(e.target.checked)} />
          <label htmlFor="async" style={{ fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>异步执行（不阻塞工具调用）</label>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 14px', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer' }}>取消</button>
          <button onClick={save} style={{ padding: '7px 14px', fontSize: 13, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>保存</button>
        </div>
      </div>
    </div>
  )
}

export default function HooksPage() {
  const [hooks, setHooks] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editor, setEditor] = useState(null)  // { event, ruleIdx } | null
  const [addingEvent, setAddingEvent] = useState(null)
  const { showToast } = useToast()

  function load() {
    setLoading(true)
    fetch('/api/hooks').then(r => r.json()).then(d => { setHooks(d); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function saveAll(updated) {
    setSaving(true)
    const res = await fetch('/api/hooks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hooks: updated }) })
    setSaving(false)
    if (res.ok) { showToast('Hooks 已保存', 'success'); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    else showToast('保存失败', 'error')
  }

  function addRule(event, rule) {
    const updated = { ...hooks, [event]: [...(hooks[event] || []), rule] }
    setHooks(updated)
    saveAll(updated)
    setAddingEvent(null)
  }

  function updateRule(event, idx, rule) {
    const updated = { ...hooks, [event]: hooks[event].map((r, i) => i === idx ? rule : r) }
    setHooks(updated)
    saveAll(updated)
    setEditor(null)
  }

  function deleteRule(event, idx) {
    if (!window.confirm('删除这条 Hook 规则？')) return
    const updated = { ...hooks, [event]: hooks[event].filter((_, i) => i !== idx) }
    if (!updated[event].length) delete updated[event]
    setHooks(updated)
    saveAll(updated)
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Hooks 管理</div>
        <button onClick={load} title="刷新" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}>↻</button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
        配置 Claude Code 生命周期钩子
      </div>
      <div style={{ marginBottom: 20 }}>
        <PathBadge path="~/.claude/settings.json" />
      </div>

      {loading ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div> : (
        HOOK_EVENTS.map(event => {
          const rules = hooks[event] || []
          return (
            <div key={event} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{event}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{EVENT_DESC[event]}</div>
                {rules.length > 0 && <div style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 2 }}>· {rules.length} 条规则</div>}
                <button onClick={() => setAddingEvent(event)} style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 11, borderRadius: 4, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>+ 添加</button>
              </div>
              {rules.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--text2)', padding: '8px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6 }}>暂无规则</div>
                : rules.map((rule, idx) => (
                    <div key={idx} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {rule.matcher && (
                          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3 }}>
                            匹配：<code style={{ background: 'var(--bg3)', padding: '1px 4px', borderRadius: 3 }}>{rule.matcher}</code>
                          </div>
                        )}
                        <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)', wordBreak: 'break-all' }}>
                          {rule.hooks?.[0]?.command || '（无命令）'}
                        </div>
                        {rule.hooks?.[0]?.async && (
                          <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>异步</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => setEditor({ event, idx })} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>编辑</button>
                        <button onClick={() => deleteRule(event, idx)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>删除</button>
                      </div>
                    </div>
                  ))
              }
            </div>
          )
        })
      )}

      {addingEvent && (
        <RuleEditor rule={null} onSave={rule => addRule(addingEvent, rule)} onClose={() => setAddingEvent(null)} />
      )}
      {editor && (
        <RuleEditor
          rule={hooks[editor.event]?.[editor.idx]}
          onSave={rule => updateRule(editor.event, editor.idx, rule)}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  )
}
