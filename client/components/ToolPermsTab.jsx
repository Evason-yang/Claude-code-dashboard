import React, { useEffect, useState } from 'react'

// 完整的 Claude Code 内置工具列表（含分类、描述、风险等级）
const BUILTIN_TOOLS = [
  { name: 'Bash',          category: '执行',   desc: '执行 shell 命令',           risk: 'high',   color: '#f0883e' },
  { name: 'Read',          category: '文件',   desc: '读取文件内容',               risk: 'low',    color: '#58a6ff' },
  { name: 'Write',         category: '文件',   desc: '写入/创建文件',              risk: 'medium', color: '#3fb950' },
  { name: 'Edit',          category: '文件',   desc: '精确替换文件内容',           risk: 'medium', color: '#3fb950' },
  { name: 'MultiEdit',     category: '文件',   desc: '多处编辑文件',               risk: 'medium', color: '#3fb950' },
  { name: 'Glob',          category: '文件',   desc: '文件模式匹配搜索',           risk: 'low',    color: '#58a6ff' },
  { name: 'Grep',          category: '文件',   desc: '内容搜索（ripgrep）',        risk: 'low',    color: '#58a6ff' },
  { name: 'LS',            category: '文件',   desc: '列出目录内容',               risk: 'low',    color: '#58a6ff' },
  { name: 'WebFetch',      category: '网络',   desc: '获取网页内容',               risk: 'medium', color: '#d2a8ff' },
  { name: 'WebSearch',     category: '网络',   desc: '网络搜索',                   risk: 'medium', color: '#d2a8ff' },
  { name: 'Agent',         category: 'Agent',  desc: '派发子 Agent 执行任务',      risk: 'high',   color: '#79c0ff' },
  { name: 'Skill',         category: 'Agent',  desc: '调用 Skill 插件',            risk: 'medium', color: '#79c0ff' },
  { name: 'TodoRead',      category: '任务',   desc: '读取任务列表',               risk: 'low',    color: '#8b949e' },
  { name: 'TodoWrite',     category: '任务',   desc: '写入任务列表',               risk: 'low',    color: '#8b949e' },
  { name: 'TaskCreate',    category: '任务',   desc: '创建任务',                   risk: 'low',    color: '#8b949e' },
  { name: 'TaskUpdate',    category: '任务',   desc: '更新任务状态',               risk: 'low',    color: '#8b949e' },
  { name: 'NotebookRead',  category: '文件',   desc: '读取 Jupyter Notebook',      risk: 'low',    color: '#58a6ff' },
  { name: 'NotebookEdit',  category: '文件',   desc: '编辑 Jupyter Notebook',      risk: 'medium', color: '#3fb950' },
]

const RISK_LABELS = { high: '高风险', medium: '中', low: '低' }
const RISK_COLORS = { high: '#f85149', medium: '#f0883e', low: '#3fb950' }

// 判断某工具在 allow/deny 规则中的状态
// 返回 'allow' | 'deny' | 'default'
function getToolStatus(toolName, allow, deny) {
  // 精确匹配（如 "Bash"）或前缀匹配（如 "Bash(npm:*)"）
  const inAllow = allow.some(r => r === toolName || r.startsWith(toolName + '('))
  const inDeny = deny.some(r => r === toolName || r.startsWith(toolName + '('))
  if (inDeny) return 'deny'
  if (inAllow) return 'allow'
  return 'default'
}

// 获取某工具的所有规则（含参数化规则）
function getToolRules(toolName, allow, deny) {
  return {
    allow: allow.filter(r => r === toolName || r.startsWith(toolName + '(')),
    deny: deny.filter(r => r === toolName || r.startsWith(toolName + '(')),
  }
}

export default function ToolPermsTab({ project, refreshKey }) {
  const [allow, setAllow] = useState([])
  const [deny, setDeny] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(null)  // 展开的工具名
  const [customRule, setCustomRule] = useState('')  // 自定义规则输入
  const [customList, setCustomList] = useState('allow')

  function load() {
    fetch(`/api/projects/${project.id}/toolperms`)
      .then(r => r.json())
      .then(d => { setAllow(d.allow || []); setDeny(d.deny || []) })
  }

  useEffect(() => { load() }, [project.id, refreshKey])

  async function save() {
    setSaving(true)
    await fetch(`/api/projects/${project.id}/toolperms`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allow, deny })
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // 切换工具的基础权限状态（无参数）
  function toggleTool(toolName, currentStatus) {
    // default → allow → deny → default
    const next = currentStatus === 'default' ? 'allow' : currentStatus === 'allow' ? 'deny' : 'default'
    // 先移除该工具的精确规则
    let newAllow = allow.filter(r => r !== toolName)
    let newDeny = deny.filter(r => r !== toolName)
    if (next === 'allow') newAllow = [...newAllow, toolName]
    if (next === 'deny') newDeny = [...newDeny, toolName]
    setAllow(newAllow)
    setDeny(newDeny)
  }

  // 添加自定义参数化规则
  function addCustomRule(toolName) {
    const r = customRule.trim() || toolName
    if (!r) return
    if (customList === 'allow') setAllow(prev => [...prev, r])
    else setDeny(prev => [...prev, r])
    setCustomRule('')
  }

  // 删除单条规则
  function removeRule(rule, list) {
    if (list === 'allow') setAllow(prev => prev.filter(r => r !== rule))
    else setDeny(prev => prev.filter(r => r !== rule))
  }

  // 按分类分组
  const categories = [...new Set(BUILTIN_TOOLS.map(t => t.category))]

  // 未在内置列表中的自定义规则
  const knownToolNames = new Set(BUILTIN_TOOLS.map(t => t.name))
  const customAllowRules = allow.filter(r => {
    const name = r.split('(')[0]
    return !knownToolNames.has(name)
  })
  const customDenyRules = deny.filter(r => {
    const name = r.split('(')[0]
    return !knownToolNames.has(name)
  })

  return (
    <div>
      {/* 工具列表 */}
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{cat}</div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {BUILTIN_TOOLS.filter(t => t.category === cat).map((tool, idx, arr) => {
              const status = getToolStatus(tool.name, allow, deny)
              const rules = getToolRules(tool.name, allow, deny)
              const isExpanded = expanded === tool.name
              const isLast = idx === arr.length - 1

              return (
                <div key={tool.name} style={{ borderBottom: (!isLast || isExpanded) ? '1px solid var(--border)' : 'none' }}>
                  {/* 工具行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px' }}>
                    {/* 工具名 + 描述 */}
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: tool.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace', color: 'var(--text)' }}>{tool.name}</span>
                        <span style={{ fontSize: 10, color: RISK_COLORS[tool.risk], padding: '0 4px', borderRadius: 3, background: `${RISK_COLORS[tool.risk]}18` }}>{RISK_LABELS[tool.risk]}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{tool.desc}</div>
                    </div>

                    {/* 已有的参数化规则数量 */}
                    {(rules.allow.length > 0 || rules.deny.length > 0) && (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {rules.allow.length > 0 && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#3fb95022', color: '#3fb950', border: '1px solid #3fb95044' }}>
                            allow ×{rules.allow.length}
                          </span>
                        )}
                        {rules.deny.length > 0 && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#f8514922', color: '#f85149', border: '1px solid #f8514944' }}>
                            deny ×{rules.deny.length}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 权限切换按钮 */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {['allow', 'default', 'deny'].map(s => {
                        const active = status === s
                        const colors = { allow: '#3fb950', default: 'var(--text2)', deny: '#f85149' }
                        const labels = { allow: '允许', default: '默认', deny: '拒绝' }
                        return (
                          <button key={s} onClick={() => toggleTool(tool.name, status)}
                            style={{
                              padding: '3px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                              border: `1px solid ${active ? colors[s] : 'var(--border)'}`,
                              background: active ? `${colors[s]}22` : 'transparent',
                              color: active ? colors[s] : 'var(--text2)',
                              fontWeight: active ? 600 : 400
                            }}
                            title={`点击切换：默认→允许→拒绝→默认`}
                          >
                            {labels[s]}
                          </button>
                        )
                      })}
                    </div>

                    {/* 展开按钮（管理参数化规则） */}
                    <button onClick={() => setExpanded(isExpanded ? null : tool.name)}
                      style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 11, padding: '2px 4px', flexShrink: 0 }}>
                      {isExpanded ? '▲' : '▼'}
                    </button>
                  </div>

                  {/* 展开：参数化规则管理 */}
                  {isExpanded && (
                    <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>
                        参数化规则（如 <code style={{ background: 'var(--bg2)', padding: '1px 4px', borderRadius: 3 }}>{tool.name}(npm run:*)</code>）
                      </div>
                      {/* 现有规则列表 */}
                      {[...rules.allow.map(r => ({ r, list: 'allow' })), ...rules.deny.map(r => ({ r, list: 'deny' }))].map(({ r, list }) => (
                        <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: 'var(--bg2)', borderRadius: 4, marginBottom: 4, fontSize: 12, fontFamily: 'monospace' }}>
                          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: list === 'allow' ? '#3fb95022' : '#f8514922', color: list === 'allow' ? '#3fb950' : '#f85149', flexShrink: 0 }}>{list}</span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{r}</span>
                          <button onClick={() => removeRule(r, list)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </div>
                      ))}
                      {/* 添加新参数化规则 */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <select value={customList} onChange={e => setCustomList(e.target.value)}
                          style={{ padding: '4px 6px', fontSize: 11, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }}>
                          <option value="allow">allow</option>
                          <option value="deny">deny</option>
                        </select>
                        <input value={customRule} onChange={e => setCustomRule(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addCustomRule(tool.name)}
                          placeholder={`${tool.name}(参数:*)`}
                          style={{ flex: 1, padding: '4px 8px', fontSize: 11, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontFamily: 'monospace' }} />
                        <button onClick={() => addCustomRule(tool.name)}
                          style={{ padding: '4px 10px', fontSize: 11, borderRadius: 4, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>添加</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* 自定义工具规则（不在内置列表中的） */}
      {(customAllowRules.length > 0 || customDenyRules.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>其他自定义规则</div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            {[...customAllowRules.map(r => ({ r, list: 'allow' })), ...customDenyRules.map(r => ({ r, list: 'deny' }))].map(({ r, list }) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: 'var(--bg3)', borderRadius: 4, marginBottom: 4, fontSize: 12, fontFamily: 'monospace' }}>
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: list === 'allow' ? '#3fb95022' : '#f8514922', color: list === 'allow' ? '#3fb950' : '#f85149', flexShrink: 0 }}>{list}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{r}</span>
                <button onClick={() => removeRule(r, list)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 保存按钮 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
        <button onClick={save} disabled={saving} style={{ padding: '7px 18px', fontSize: 13, borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
          {saving ? '保存中...' : '保存权限'}
        </button>
        <button onClick={load} style={{ padding: '7px 14px', fontSize: 13, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer' }}>重置</button>
        {saved && <span style={{ fontSize: 12, color: '#3fb950' }}>✓ 已保存</span>}
      </div>
    </div>
  )
}
