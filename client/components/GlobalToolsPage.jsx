import React, { useEffect, useState } from 'react'
import PathBadge from './PathBadge.jsx'

const BUILTIN_TOOLS = [
  { name: 'Bash',         category: '执行',  desc: '执行 shell 命令',          risk: 'high' },
  { name: 'Read',         category: '文件',  desc: '读取文件内容',              risk: 'low' },
  { name: 'Write',        category: '文件',  desc: '写入/创建文件',             risk: 'medium' },
  { name: 'Edit',         category: '文件',  desc: '精确替换文件内容',          risk: 'medium' },
  { name: 'MultiEdit',    category: '文件',  desc: '多处编辑文件',              risk: 'medium' },
  { name: 'Glob',         category: '文件',  desc: '文件模式匹配搜索',          risk: 'low' },
  { name: 'Grep',         category: '文件',  desc: '内容搜索（ripgrep）',       risk: 'low' },
  { name: 'LS',           category: '文件',  desc: '列出目录内容',              risk: 'low' },
  { name: 'WebFetch',     category: '网络',  desc: '获取网页内容',              risk: 'medium' },
  { name: 'WebSearch',    category: '网络',  desc: '网络搜索',                  risk: 'medium' },
  { name: 'Agent',        category: 'Agent', desc: '派发子 Agent 执行任务',     risk: 'high' },
  { name: 'Skill',        category: 'Agent', desc: '调用 Skill 插件',           risk: 'medium' },
  { name: 'TodoRead',     category: '任务',  desc: '读取任务列表',              risk: 'low' },
  { name: 'TodoWrite',    category: '任务',  desc: '写入任务列表',              risk: 'low' },
  { name: 'TaskCreate',   category: '任务',  desc: '创建任务',                  risk: 'low' },
  { name: 'TaskUpdate',   category: '任务',  desc: '更新任务状态',              risk: 'low' },
  { name: 'NotebookRead', category: '文件',  desc: '读取 Jupyter Notebook',     risk: 'low' },
  { name: 'NotebookEdit', category: '文件',  desc: '编辑 Jupyter Notebook',     risk: 'medium' },
]

const RISK_COLORS = { high: '#f85149', medium: '#f0883e', low: '#3fb950' }
const RISK_LABELS = { high: '高风险', medium: '中', low: '低' }
const CAT_COLORS  = { '执行': '#f0883e', '文件': '#58a6ff', '网络': '#d2a8ff', 'Agent': '#79c0ff', '任务': '#8b949e' }

function getStatus(toolName, allow, deny) {
  if (deny.some(r => r === toolName || r.startsWith(toolName + '('))) return 'deny'
  if (allow.some(r => r === toolName || r.startsWith(toolName + '('))) return 'allow'
  return 'default'
}

export default function GlobalToolsPage() {
  const [projects, setProjects] = useState([])
  const [perms, setPerms] = useState({})   // { projectId: { allow, deny } }
  const [loading, setLoading] = useState(true)
  const [selectedTool, setSelectedTool] = useState(null)

  async function load() {
    setLoading(true)
    const ps = await fetch('/api/projects').then(r => r.json())
    setProjects(ps)
    const entries = await Promise.all(
      ps.map(p =>
        fetch(`/api/projects/${p.id}/toolperms`)
          .then(r => r.json())
          .then(d => [p.id, d])
          .catch(() => [p.id, { allow: [], deny: [] }])
      )
    )
    setPerms(Object.fromEntries(entries))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const categories = [...new Set(BUILTIN_TOOLS.map(t => t.category))]

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>工具管理</div>
        <button onClick={load} title="刷新" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}>↻</button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
        Claude Code 内置工具列表，点击工具查看各项目权限配置
      </div>
      <div style={{ marginBottom: 20 }}>
        <PathBadge path="~/.claude/settings.json" />
      </div>

      {loading ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div> : (
        <>
          {categories.map(cat => (
            <div key={cat} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: CAT_COLORS[cat] || 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{cat}</div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {BUILTIN_TOOLS.filter(t => t.category === cat).map((tool, idx, arr) => {
                  const isLast = idx === arr.length - 1
                  const isOpen = selectedTool === tool.name

                  // 统计各项目对该工具的权限
                  const statusCounts = { allow: 0, deny: 0, default: 0 }
                  projects.forEach(p => {
                    const d = perms[p.id] || { allow: [], deny: [] }
                    statusCounts[getStatus(tool.name, d.allow, d.deny)]++
                  })

                  return (
                    <div key={tool.name} style={{ borderBottom: (!isLast || isOpen) ? '1px solid var(--border)' : 'none' }}>
                      <div
                        onClick={() => setSelectedTool(isOpen ? null : tool.name)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer' }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace', color: 'var(--text)', width: 120, flexShrink: 0 }}>{tool.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1 }}>{tool.desc}</span>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: `${RISK_COLORS[tool.risk]}18`, color: RISK_COLORS[tool.risk], flexShrink: 0 }}>
                          {RISK_LABELS[tool.risk]}
                        </span>
                        {/* 权限分布摘要 */}
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {statusCounts.allow > 0 && (
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#3fb95022', color: '#3fb950', border: '1px solid #3fb95033' }}>
                              允许 {statusCounts.allow}
                            </span>
                          )}
                          {statusCounts.deny > 0 && (
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#f8514922', color: '#f85149', border: '1px solid #f8514933' }}>
                              拒绝 {statusCounts.deny}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text2)', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                      </div>

                      {/* 展开：各项目权限详情 */}
                      {isOpen && (
                        <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderTop: '1px solid var(--border)' }}>
                          {projects.length === 0
                            ? <div style={{ fontSize: 12, color: 'var(--text2)' }}>暂无项目</div>
                            : projects.map(p => {
                                const d = perms[p.id] || { allow: [], deny: [] }
                                const status = getStatus(tool.name, d.allow, d.deny)
                                const rules = [
                                  ...d.allow.filter(r => r === tool.name || r.startsWith(tool.name + '(')).map(r => ({ r, list: 'allow' })),
                                  ...d.deny.filter(r => r === tool.name || r.startsWith(tool.name + '(')).map(r => ({ r, list: 'deny' })),
                                ]
                                return (
                                  <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6, fontSize: 12 }}>
                                    <span style={{ width: 120, color: 'var(--text)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                    {status === 'default' && <span style={{ color: 'var(--text2)' }}>默认</span>}
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                      {rules.map(({ r, list }) => (
                                        <span key={r} style={{
                                          fontSize: 11, padding: '1px 7px', borderRadius: 3, fontFamily: 'monospace',
                                          background: list === 'allow' ? '#3fb95022' : '#f8514922',
                                          color: list === 'allow' ? '#3fb950' : '#f85149',
                                          border: `1px solid ${list === 'allow' ? '#3fb95044' : '#f8514944'}`
                                        }}>{r}</span>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })
                          }
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
