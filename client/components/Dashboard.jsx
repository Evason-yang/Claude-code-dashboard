import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from './Toast.jsx'

const MODEL_COLORS = {
  'claude-opus-4-6': '#58a6ff',
  'claude-opus-4-6[1m]': '#79c0ff',
  'claude-sonnet-4-6': '#3fb950',
  'claude-haiku-4-5': '#f78166',
  '<synthetic>': '#8b949e',
  'default': '#8b949e'
}

function fmt(n) {
  if (!n) return '0'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return String(n)
}

function fmtCost(c) {
  if (!c || c < 0.001) return '$0'
  return '$' + c.toFixed(2)
}

function relativeTime(iso) {
  if (!iso) return '从未活动'
  const diff = Date.now() - new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

// SVG 饼图（带中心文字）
function DonutChart({ data, size = 120, label, sublabel }) {
  if (!data.length) return null
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return null

  const r = size / 2 - 10
  const ir = r * 0.58  // 内圆半径（donut）
  const cx = size / 2, cy = size / 2
  let angle = -Math.PI / 2
  const slices = data.map(d => {
    const sweep = (d.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    const ix1 = cx + ir * Math.cos(angle), iy1 = cy + ir * Math.sin(angle)
    angle += sweep
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle)
    const ix2 = cx + ir * Math.cos(angle), iy2 = cy + ir * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return {
      ...d,
      path: `M${ix1},${iy1} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${ir},${ir} 0 ${large},0 ${ix1},${iy1} Z`
    }
  })

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} opacity={0.9} />
      ))}
      {label && (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text)">{label}</text>
          {sublabel && <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="var(--text2)">{sublabel}</text>}
        </>
      )}
    </svg>
  )
}

// 横向条形图
function BarChart({ data, maxVal }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
          <div style={{ width: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)', flexShrink: 0 }}>{d.label}</div>
          <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.value / maxVal) * 100}%`, background: d.color, borderRadius: 3 }} />
          </div>
          <div style={{ width: 52, textAlign: 'right', color: 'var(--text2)', fontFamily: 'monospace', flexShrink: 0 }}>{fmt(d.value)}</div>
        </div>
      ))}
    </div>
  )
}

const S = {
  page: { flex: 1, overflow: 'auto', padding: 24 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'var(--text2)', marginBottom: 20 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 },
  statCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' },
  statLabel: { fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 700, color: 'var(--text)' },
  statSub: { fontSize: 11, color: 'var(--text2)', marginTop: 2 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  chartCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' },
  chartTitle: { fontSize: 13, fontWeight: 600, marginBottom: 12 },
  legend: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, justifyContent: 'center' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 },
  legendDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  projectGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 },
  projectCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', cursor: 'pointer', transition: 'border-color 0.15s' },
  projectName: { fontSize: 13, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  projectMeta: { fontSize: 11, color: 'var(--text2)', marginBottom: 6 },
  projectTokens: { fontSize: 11, color: 'var(--text2)' },
  empty: { color: 'var(--text2)', fontSize: 13, padding: '40px 0', textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: 600, marginBottom: 10 },
}

export default function Dashboard({ projects }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [usage, setUsage] = useState(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  useEffect(() => {
    fetch('/api/usage').then(r => r.json()).then(setUsage).catch(() => showToast('加载用量数据失败', 'error'))
  }, [refreshKey])

  const totalTokens = useMemo(
    () => (usage?.totalInputTokens || 0) + (usage?.totalOutputTokens || 0),
    [usage]
  )
  const byModel = useMemo(
    () => (usage?.byModel || []).filter(m => m.model !== '<synthetic>' && (m.input + m.output) > 0),
    [usage]
  )
  const maxModelTokens = useMemo(
    () => Math.max(...byModel.map(m => m.input + m.output), 1),
    [byModel]
  )

  const pieData = useMemo(() => byModel.map(m => ({
    value: m.input + m.output,
    color: MODEL_COLORS[m.model] || MODEL_COLORS.default,
    label: m.model.replace('claude-', '')
  })), [byModel])

  // 项目活跃度条形图数据
  const projectBarData = useMemo(() => (usage?.byProject || [])
    .slice(0, 6)
    .map(p => ({
      label: p.name,
      value: p.inputTokens + p.outputTokens,
      color: 'var(--accent)'
    })), [usage])
  const maxProjTokens = useMemo(
    () => Math.max(...projectBarData.map(d => d.value), 1),
    [projectBarData]
  )

  const sortedRecentProjects = useMemo(() =>
    [...projects]
      .filter(p => p.lastActive)
      .sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive))
      .slice(0, 8),
    [projects]
  )

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={S.title}>总览</div>
        <button onClick={() => setRefreshKey(k => k + 1)} title="刷新" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}>↻</button>
      </div>
      <div style={S.subtitle}>{projects.length} 个项目</div>

      {/* 汇总统计 */}
      <div style={S.statsRow}>
        <div style={S.statCard}>
          <div style={S.statLabel}>项目数</div>
          <div style={S.statValue}>{projects.length}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>总 Token</div>
          <div style={S.statValue}>{fmt(totalTokens)}</div>
          <div style={S.statSub}>输入 + 输出</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>估算费用</div>
          <div style={S.statValue}>{fmtCost(usage?.totalCostUSD)}</div>
          <div style={S.statSub}>按官方定价</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>使用模型</div>
          <div style={S.statValue}>{byModel.length}</div>
          <div style={S.statSub}>个不同模型</div>
        </div>
      </div>

      {/* 图表区 */}
      {byModel.length > 0 && (
        <div style={S.chartsRow}>
          {/* 模型用量占比 */}
          <div style={S.chartCard}>
            <div style={S.chartTitle}>模型用量占比</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <DonutChart
                data={pieData}
                size={110}
                label={fmt(totalTokens)}
                sublabel="tokens"
              />
              <div style={S.legend}>
                {byModel.map(m => {
                  const total = m.input + m.output
                  const pct = totalTokens ? Math.round((total / totalTokens) * 100) : 0
                  const color = MODEL_COLORS[m.model] || MODEL_COLORS.default
                  return (
                    <div key={m.model} style={S.legendItem}>
                      <div style={{ ...S.legendDot, background: color }} />
                      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                        {m.model.replace('claude-', '')}
                      </div>
                      <div style={{ color: 'var(--text2)', flexShrink: 0 }}>{pct}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 项目 Token 用量 */}
          <div style={S.chartCard}>
            <div style={S.chartTitle}>项目 Token 用量</div>
            {projectBarData.length > 0
              ? <BarChart data={projectBarData} maxVal={maxProjTokens} />
              : <div style={{ color: 'var(--text2)', fontSize: 12 }}>暂无数据</div>
            }
          </div>
        </div>
      )}

      {/* 项目卡片 */}
      <div style={S.sectionTitle}>所有项目</div>
      {projects.length === 0
        ? <div style={S.empty}>暂无项目，请在左侧添加扫描目录</div>
        : <div style={S.projectGrid}>
            {projects.map(p => {
              const pu = usage?.byProject?.find(x => x.id === p.id)
              return (
                <div
                  key={p.id}
                  style={S.projectCard}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={S.projectName}>
                    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginRight: 5, verticalAlign: 'middle', background: p.lastActive ? 'var(--green)' : 'var(--text2)' }} />
                    {p.name}
                  </div>
                  <div style={S.projectMeta}>{relativeTime(p.lastActive)}</div>
                  {pu && (
                    <div style={S.projectTokens}>
                      {fmt(pu.inputTokens + pu.outputTokens)} tokens · {fmtCost(pu.cost)}
                    </div>
                  )}
                  {/* 模型 mini badges */}
                  {pu?.byModel?.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {pu.byModel.filter(m => m.model !== '<synthetic>').slice(0, 2).map(m => {
                        const color = MODEL_COLORS[m.model] || MODEL_COLORS.default
                        const short = m.model.replace('claude-', '').replace('-4-6', '').replace('-4-5', '')
                        return (
                          <span key={m.model} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, color, border: `1px solid ${color}44`, background: `${color}15` }}>
                            {short}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
      }

      {/* 最近活动时间线 */}
      {projects.filter(p => p.lastActive).length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={S.sectionTitle}>最近活动</div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {sortedRecentProjects.map((p, i, arr) => {
                const d = new Date(p.lastActive)
                const pad = n => String(n).padStart(2, '0')
                const timeStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', fontSize: 13 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text2)', flexShrink: 0, fontFamily: 'monospace' }}>{timeStr}</span>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}
    </div>
  )
}
