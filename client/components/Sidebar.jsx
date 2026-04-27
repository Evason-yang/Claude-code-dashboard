import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const S = {
  sidebar: { width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' },
  appName: { padding: '14px 12px 12px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.2px' },
  section: { padding: '10px 0 4px' },
  sectionTitle: { padding: '0 12px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  navItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', paddingLeft: 14, fontSize: 13, color: 'var(--text)', textDecoration: 'none' },
  navItemActive: { background: 'var(--bg3)', borderLeft: '2px solid var(--accent)', paddingLeft: 12, color: 'var(--accent)' },
  projectList: { flex: 1, overflowY: 'auto', borderTop: '1px solid var(--border)' },
  projectSection: { padding: '10px 0 4px' },
  dot: { display: 'inline-block', width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  footer: { padding: '10px 12px', borderTop: '1px solid var(--border)', fontSize: 12 },
  addBtn: { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, padding: 0 },
}

const globalNav = [
  { label: '总览', icon: '◈', path: '/dashboard' },
  { label: '全局搜索', icon: '🔍', path: '/search' },
  { label: '模型管理', icon: '◇', path: '/models' },
  { label: '用量统计', icon: '◉', path: '/usage' },
  { label: 'Skill 管理', icon: '◆', path: '/skills' },
  { label: '记忆管理', icon: '◎', path: '/memories' },
  { label: '全局 Prompt', icon: '✎', path: '/global-prompt' },
  { label: '工具管理', icon: '⚙', path: '/tools' },
  { label: 'Slash Commands', icon: '/', path: '/commands' },
  { label: 'MCP 管理', icon: '⟳', path: '/mcp' },
  { label: 'Hooks', icon: '⚡', path: '/hooks' },
  { label: '插件管理', icon: '◈', path: '/plugins' },
  { label: '全局配置', icon: '⚙', path: '/global-settings' },
]

function ProjectItem({ p, onRemove, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver }) {
  const [hover, setHover] = useState(false)
  const navigate = useNavigate()

  async function handleRemove(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`从列表中移除「${p.name}」？`)) return
    await fetch(`/api/projects/${p.id}`, { method: 'DELETE' })
    navigate('/dashboard')
    window.location.reload()
  }

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, p)}
      onDragOver={e => onDragOver(e, p)}
      onDrop={e => onDrop(e, p)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        borderTop: isDragOver ? '2px solid var(--accent)' : '2px solid transparent',
        cursor: 'grab',
      }}
    >
      <NavLink
        to={`/projects/${p.id}`}
        style={({ isActive }) => ({
          ...S.navItem,
          paddingRight: 28,
          ...(isActive ? S.navItemActive : {})
        })}
      >
        <span style={{ ...S.dot, background: p.lastActive ? 'var(--green)' : 'var(--text2)' }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{p.name}</span>
      </NavLink>
      <button
        onClick={handleRemove}
        title="从列表移除"
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer',
          fontSize: 13, padding: '0 2px', lineHeight: 1,
          opacity: hover ? 0.5 : 0, transition: 'opacity 0.1s'
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = hover ? '0.5' : '0'}
      >✕</button>
    </div>
  )
}

function getInitialTheme() {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function Sidebar({ projects, onProjectsReorder, onRefresh }) {
  const [dragOverPath, setDragOverPath] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const dragItem = useRef(null)
  const [theme, setTheme] = useState(getInitialTheme)
  const [projectFilter, setProjectFilter] = useState('')
  const [updateInfo, setUpdateInfo] = useState(null)

  useEffect(() => {
    fetch('/api/version').then(r => r.json()).then(d => {
      if (d.hasUpdate) setUpdateInfo(d)
    }).catch(() => {})
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(next)
  }

  function handleDragStart(e, p) {
    dragItem.current = p
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, p) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragItem.current?.path !== p.path) setDragOverPath(p.path)
  }

  function handleDrop(e, target) {
    e.preventDefault()
    const from = dragItem.current
    if (!from || from.path === target.path) return
    const newOrder = [...projects]
    const fromIdx = newOrder.findIndex(p => p.path === from.path)
    const toIdx = newOrder.findIndex(p => p.path === target.path)
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, from)
    setDragOverPath(null)
    dragItem.current = null
    // 保存顺序
    const order = newOrder.map(p => p.path)
    fetch('/api/projects/order', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order })
    })
    onProjectsReorder(newOrder)
  }

  function handleDragEnd() {
    setDragOverPath(null)
    dragItem.current = null
  }

  async function handleAddProject() {
    const path = window.prompt('输入路径：\n· 项目目录 → 直接添加\n· 父目录 → 自动发现其中所有项目')
    if (!path) return
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: path.trim() })
    })
    if (res.ok) window.location.reload()
    else alert('添加失败，请检查路径是否存在')
  }

  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')

  function handleSearchKey(e) {
    if (e.key === 'Enter' && searchInput.trim().length >= 1) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`)
      setSearchInput('')
    }
  }

  return (
    <div style={S.sidebar}>
      <div style={S.appName}>Claude Code 管理器</div>

      {/* 快捷搜索框 */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKey}
          placeholder="搜索会话... (Enter)"
          style={{ width: '100%', padding: '5px 8px', fontSize: 11, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>工具</div>
        {globalNav.map(n => (
          <NavLink
            key={n.path}
            to={n.path}
            style={({ isActive }) => ({ ...S.navItem, ...(isActive ? S.navItemActive : {}) })}
          >
            <span style={{ fontSize: 12, width: 14, textAlign: 'center', flexShrink: 0 }}>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </div>

      <div style={S.projectList}>
        <div style={S.projectSection}>
          <div style={{ ...S.sectionTitle, display: 'flex', alignItems: 'center', gap: 4 }}>
            项目
            <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· 拖拽排序</span>
            <button
              onClick={async () => {
                setRefreshing(true)
                await onRefresh()
                setRefreshing(false)
              }}
              title="刷新项目列表"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 12, padding: '0 2px', lineHeight: 1, opacity: refreshing ? 0.4 : 0.7, transition: 'opacity 0.1s', display: 'flex', alignItems: 'center' }}
            >
              <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: refreshing ? 'transform 0.6s linear' : 'none' }}>⟳</span>
            </button>
          </div>
          {projects.length > 5 && (
            <div style={{ padding: '4px 12px 6px' }}>
              <input
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                placeholder="过滤项目..."
                style={{ width: '100%', padding: '4px 8px', fontSize: 11, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', outline: 'none' }}
              />
            </div>
          )}
          {(() => {
            const filteredProjects = projectFilter
              ? projects.filter(p => p.name.toLowerCase().includes(projectFilter.toLowerCase()))
              : projects
            return filteredProjects.map(p => (
              <ProjectItem
                key={p.id}
                p={p}
                isDragOver={dragOverPath === p.path}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))
          })()}
        </div>
      </div>

      {updateInfo && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: '#1a2a1a', fontSize: 12 }}>
          <div style={{ color: '#3fb950', fontWeight: 600, marginBottom: 3 }}>有新版本 v{updateInfo.latest}</div>
          <div style={{ color: 'var(--text2)', marginBottom: 6 }}>当前 v{updateInfo.local}</div>
          <code style={{ display: 'block', fontSize: 10, color: 'var(--text2)', background: 'var(--bg3)', padding: '4px 6px', borderRadius: 4, wordBreak: 'break-all', lineHeight: 1.5 }}>
            curl -fsSL https://raw.githubusercontent.com/Evason-yang/Claude-code-dashboard/main/install.sh | bash
          </code>
        </div>
      )}
      <div style={{ ...S.footer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={S.addBtn} onClick={handleAddProject}>+ 添加项目</button>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? '切换到浅色' : '切换到深色'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text2)', padding: '2px 4px', borderRadius: 4, lineHeight: 1 }}
        >
          {theme === 'dark' ? '☀' : '◑'}
        </button>
      </div>
    </div>
  )
}
