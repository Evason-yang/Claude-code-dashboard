import React from 'react'
import { useParams, NavLink, Routes, Route } from 'react-router-dom'
import OverviewTab from './OverviewTab.jsx'
import SessionList from './SessionList.jsx'
import GitLog from './GitLog.jsx'
import SkillsTab from './SkillsTab.jsx'
import MemoryTab from './MemoryTab.jsx'
import ClaudeMdTab from './ClaudeMdTab.jsx'
import ToolPermsTab from './ToolPermsTab.jsx'
import ProjectCommandsTab from './ProjectCommandsTab.jsx'
import SessionSearchTab from './SessionSearchTab.jsx'

const S = {
  container: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: 600 },
  tabs: { display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px' },
  tab: { padding: '8px 14px', fontSize: 13, color: 'var(--text2)', textDecoration: 'none', borderBottom: 'none', paddingBottom: 10, marginBottom: 0 },
  tabActive: { color: 'var(--accent)', borderBottom: '2px solid var(--accent)', paddingBottom: 8, marginBottom: 0 },
  content: { flex: 1, overflow: 'auto', padding: 16 }
}

export default function ProjectDetail({ projects }) {
  const { id } = useParams()
  const project = projects.find(p => p.id === id)
  const [refreshKey, setRefreshKey] = React.useState(0)

  if (!project) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
      项目未找到
    </div>
  )

  const tabs = [
    { label: '概览', path: '' },
    { label: '会话历史', path: 'sessions' },
    { label: '搜索', path: 'search' },
    { label: 'Git 记录', path: 'git' },
    { label: '可用 Skill', path: 'skills' },
    { label: '记忆', path: 'memories' },
    { label: 'CLAUDE.md', path: 'claudemd' },
    { label: '工具权限', path: 'toolperms' },
    { label: 'Commands', path: 'commands' },
  ]

  return (
    <div style={S.container}>
      <div style={S.header}>
        <span style={S.name}>{project.name}</span>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          title="刷新"
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}
        >↻</button>
      </div>
      <div style={S.tabs}>
        {tabs.map(t => (
          <NavLink
            key={t.label}
            to={t.path === '' ? `/projects/${id}` : `/projects/${id}/${t.path}`}
            end
            style={({ isActive }) => ({ ...S.tab, ...(isActive ? S.tabActive : {}) })}
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <div style={S.content}>
        <Routes>
          <Route index element={<OverviewTab project={project} refreshKey={refreshKey} />} />
          <Route path="sessions" element={<SessionList project={project} refreshKey={refreshKey} />} />
          <Route path="search" element={<SessionSearchTab project={project} />} />
          <Route path="git" element={<GitLog project={project} refreshKey={refreshKey} />} />
          <Route path="skills" element={<SkillsTab refreshKey={refreshKey} />} />
          <Route path="memories" element={<MemoryTab project={project} refreshKey={refreshKey} />} />
          <Route path="claudemd" element={<ClaudeMdTab project={project} refreshKey={refreshKey} />} />
          <Route path="toolperms" element={<ToolPermsTab project={project} refreshKey={refreshKey} />} />
          <Route path="commands" element={<ProjectCommandsTab project={project} refreshKey={refreshKey} />} />
        </Routes>
      </div>
    </div>
  )
}
