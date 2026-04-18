import React, { useEffect, useState } from 'react'
import { useToast } from './Toast.jsx'

function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const { showToast } = useToast()

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/plugins')
      setPlugins(await res.json())
    } catch {
      showToast('加载插件列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleUninstall(plugin) {
    if (!window.confirm(`确定卸载插件「${plugin.name}」？\n这将删除插件缓存目录。`)) return
    setDeleting(plugin.key)
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(plugin.key)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast(`已卸载 ${plugin.name}`, 'success')
      await load()
    } catch (e) {
      showToast(`卸载失败：${e.message}`, 'error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>插件管理</div>
        <button onClick={load} title="刷新" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}>↻</button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
        通过 <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 3 }}>/plugins</code> 安装的插件 · {plugins.length} 个已安装
      </div>

      {loading ? (
        <div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
      ) : plugins.length === 0 ? (
        <div style={{ color: 'var(--text2)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
          暂无已安装的插件
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plugins.map(p => (
            <div key={p.key} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* 图标 */}
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                ◆
              </div>

              {/* 信息 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{p.name}</span>
                  <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--accent)22', color: 'var(--accent)', fontWeight: 500 }}>
                    v{p.version}
                  </span>
                  <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--bg3)', color: 'var(--text2)' }}>
                    {p.scope}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>来源: <span style={{ color: 'var(--text)' }}>{p.marketplace}</span></span>
                  <span>安装时间: <span style={{ color: 'var(--text)' }}>{fmtTime(p.installedAt)}</span></span>
                  {p.gitCommitSha && (
                    <span>Commit: <code style={{ fontSize: 11, color: 'var(--text2)' }}>{p.gitCommitSha.slice(0, 7)}</code></span>
                  )}
                </div>
              </div>

              {/* 卸载按钮 */}
              <button
                onClick={() => handleUninstall(p)}
                disabled={deleting === p.key}
                style={{
                  padding: '5px 12px', fontSize: 12, borderRadius: 5,
                  border: '1px solid var(--border)', background: 'none',
                  color: deleting === p.key ? 'var(--text2)' : '#f85149',
                  cursor: deleting === p.key ? 'not-allowed' : 'pointer',
                  flexShrink: 0, opacity: deleting === p.key ? 0.5 : 1
                }}
              >
                {deleting === p.key ? '卸载中...' : '卸载'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
