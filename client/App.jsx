import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/Toast.jsx'
import Sidebar from './components/Sidebar.jsx'
import ProjectDetail from './components/ProjectDetail.jsx'
import OnboardingModal from './components/OnboardingModal.jsx'
import Dashboard from './components/Dashboard.jsx'
import UsagePage from './components/UsagePage.jsx'
import SkillsPage from './components/SkillsPage.jsx'
import ModelsPage from './components/ModelsPage.jsx'
import MemoriesPage from './components/MemoriesPage.jsx'
import GlobalPromptPage from './components/GlobalPromptPage.jsx'
import GlobalToolsPage from './components/GlobalToolsPage.jsx'
import CommandsPage from './components/CommandsPage.jsx'
import McpPage from './components/McpPage.jsx'
import HooksPage from './components/HooksPage.jsx'
import GlobalSearchPage from './components/GlobalSearchPage.jsx'

export default function App() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  async function fetchProjects() {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(data)
    setLoading(false)
    return data
  }

  useEffect(() => {
    fetchProjects().then(data => {
      const cfg = fetch('/api/config').then(r => r.json()).then(c => {
        if (c.scanDirs.length === 0 && c.manualProjects.length === 0) {
          setShowOnboarding(true)
        }
      })
    })
  }, [])

  async function handleOnboardingClose() {
    setShowOnboarding(false)
    await fetchProjects()
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: 'var(--text2)' }}>
      加载中...
    </div>
  )

  return (
    <ToastProvider>
      {showOnboarding && <OnboardingModal onClose={handleOnboardingClose} />}
      <Sidebar projects={projects} onProjectsReorder={setProjects} />
      <Routes>
        <Route path="/dashboard" element={<Dashboard projects={projects} />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/usage" element={<UsagePage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/memories" element={<MemoriesPage />} />
        <Route path="/global-prompt" element={<GlobalPromptPage />} />
        <Route path="/tools" element={<GlobalToolsPage />} />
        <Route path="/commands" element={<CommandsPage />} />
        <Route path="/mcp" element={<McpPage />} />
        <Route path="/hooks" element={<HooksPage />} />
        <Route path="/search" element={<GlobalSearchPage />} />
        <Route path="/projects/:id/*" element={<ProjectDetail projects={projects} />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ToastProvider>
  )
}
