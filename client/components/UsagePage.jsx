import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from './Toast.jsx'

const MODEL_COLORS = {
  'claude-opus-4-6': '#58a6ff',
  'claude-opus-4-6[1m]': '#79c0ff',
  'claude-sonnet-4-6': '#3fb950',
  'claude-haiku-4-5': '#f78166',
  'default': '#8b949e'
}

function fmt(n) {
  if (!n) return '0'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return String(n)
}
function fmtCost(c) { return c < 0.001 ? '$0' : '$' + c.toFixed(2) }

// SVG 折线图（多模型叠加）
function LineChart({ series = [], models = [] }) {
  const [hover, setHover] = useState(null)  // { index, xPct }
  const chartRef = useRef(null)

  const padL = 40, padR = 8, padT = 8, padB = 22

  const totals = series.map(d => Object.values(d.byModel).reduce((s, m) => s + m.input + m.output, 0))
  const maxVal = totals.length ? Math.max(...totals, 1) : 1
  const yTicks = [0, 0.5, 1].map(r => ({ r, label: fmt(Math.round(maxVal * r)) }))
  const step = Math.max(1, Math.floor(series.length / 6))

  function xPct(i) { return series.length <= 1 ? 50 : (i / (series.length - 1)) * 100 }
  function yPct(val) { return 100 - (val / maxVal) * 100 }

  const modelLines = models.map(model => {
    const pts = series.map((d, i) => {
      const m = d.byModel[model] || { input: 0, output: 0 }
      return [xPct(i), yPct(m.input + m.output)]
    })
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')
    return { model, d, color: MODEL_COLORS[model] || MODEL_COLORS.default }
  })

  const hasData = totals.some(t => t > 0)
  const areaD = hasData
    ? series.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPct(i).toFixed(2)},${yPct(totals[i]).toFixed(2)}`).join(' ') + ` L100,100 L0,100 Z`
    : ''

  function handleMouseMove(e) {
    if (!chartRef.current || !series.length) return
    const rect = chartRef.current.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width  // 0-1
    // 找最近的数据点
    const idx = Math.round(relX * (series.length - 1))
    const clamped = Math.max(0, Math.min(series.length - 1, idx))
    setHover({ index: clamped, xPct: xPct(clamped) })
  }

  // tooltip 数据
  const hoverData = hover !== null && series[hover.index]
  const hoverTotal = hoverData ? totals[hover.index] : 0

  // tooltip 左右偏移，避免超出边界
  const tooltipLeft = hover ? (hover.xPct > 60 ? 'auto' : `${hover.xPct}%`) : 0
  const tooltipRight = hover ? (hover.xPct > 60 ? `${100 - hover.xPct}%` : 'auto') : 'auto'

  return (
    <div style={{ position: 'relative', height: 140 }}>
      {/* Y 轴标签 */}
      <div style={{ position: 'absolute', left: 0, top: padT, bottom: padB, width: padL - 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        {[...yTicks].reverse().map(t => (
          <span key={t.r} style={{ fontSize: 10, color: 'var(--text2)', lineHeight: 1 }}>{t.label}</span>
        ))}
      </div>

      {/* SVG 图形区 */}
      <div
        ref={chartRef}
        style={{ position: 'absolute', left: padL, right: padR, top: padT, bottom: padB, cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
          {/* 网格线 */}
          {yTicks.map(t => (
            <line key={t.r} x1="0" y1={yPct(maxVal * t.r)} x2="100" y2={yPct(maxVal * t.r)}
              stroke="var(--border)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          ))}
          {/* 无数据提示 */}
          {!hasData && (
            <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: 10, fill: 'var(--text2)', fontFamily: 'inherit' }}
              vectorEffect="non-scaling-stroke">暂无数据</text>
          )}
          {/* 面积 */}
          {areaD && <path d={areaD} fill="var(--accent)" opacity="0.07" />}
          {/* 折线 */}
          {modelLines.map(l => (
            <path key={l.model} d={l.d} fill="none" stroke={l.color} strokeWidth="1.5"
              opacity="0.9" vectorEffect="non-scaling-stroke" />
          ))}
          {/* Crosshair 数据点圆点（SVG 内，不含竖线） */}
          {hover !== null && modelLines.map(l => {
            const m = series[hover.index]?.byModel[l.model] || { input: 0, output: 0 }
            const val = m.input + m.output
            return val > 0 ? (
              <circle key={l.model} cx={hover.xPct} cy={yPct(val)} r="1.5"
                fill={l.color} vectorEffect="non-scaling-stroke" />
            ) : null
          })}
        </svg>
        {/* Crosshair 竖线：用 HTML 绝对定位，避免 SVG 拉伸变横条 */}
        {hover !== null && (
          <div style={{
            position: 'absolute',
            left: `${hover.xPct}%`,
            top: 0,
            bottom: 0,
            width: 1,
            background: 'var(--text2)',
            opacity: 0.4,
            pointerEvents: 'none',
            borderLeft: '1px dashed var(--text2)',
          }} />
        )}

        {/* Tooltip 浮层 */}
        {hover !== null && hoverData && hoverTotal > 0 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: tooltipLeft,
            right: tooltipRight,
            transform: hover.xPct > 60 ? 'none' : 'translateX(-50%)',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 11,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>{hoverData.date}</div>
            {models.map(model => {
              const m = hoverData.byModel[model] || { input: 0, output: 0 }
              const val = m.input + m.output
              if (!val) return null
              return (
                <div key={model} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: MODEL_COLORS[model] || MODEL_COLORS.default, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text2)' }}>{model.replace('claude-', '')}</span>
                  <span style={{ marginLeft: 4, fontFamily: 'monospace', color: 'var(--text)' }}>{fmt(val)}</span>
                </div>
              )
            })}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 3, paddingTop: 3, color: 'var(--text)', fontFamily: 'monospace' }}>
              合计 {fmt(hoverTotal)}
            </div>
          </div>
        )}
      </div>

      {/* X 轴标签 */}
      <div style={{ position: 'absolute', left: padL, right: padR, bottom: 0, height: padB }}>
        {series.map((d, i) => i % step === 0 && (
          <span key={i} style={{
            position: 'absolute', left: `${xPct(i)}%`, transform: 'translateX(-50%)',
            fontSize: 10, color: 'var(--text2)', whiteSpace: 'nowrap', lineHeight: 1, top: 4
          }}>{d.date}</span>
        ))}
      </div>
    </div>
  )
}

// 按模型视图：点击行在下方插入明细
function ModelTab({ byModel, maxModel }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      {byModel.map((m, i) => {
        const total = m.input + m.output
        const color = MODEL_COLORS[m.model] || MODEL_COLORS.default
        const isOpen = expanded === m.model
        const isLast = i === byModel.length - 1
        return (
          <React.Fragment key={m.model}>
            <div
              onClick={() => setExpanded(isOpen ? null : m.model)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: (!isLast || isOpen) ? '1px solid var(--border)' : 'none', fontSize: 13, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ width: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{m.model}</div>
              <div style={{ flex: 1, height: 5, background: 'var(--bg3)', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${(total / maxModel) * 100}%`, background: color, borderRadius: 3 }} />
              </div>
              <div style={{ width: 80, textAlign: 'right', color: 'var(--text2)', fontFamily: 'monospace', fontSize: 12, flexShrink: 0 }}>{fmt(total)}</div>
              <div style={{ width: 60, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, flexShrink: 0 }}>{fmtCost(m.cost)}</div>
              <div style={{ width: 12, textAlign: 'right', color: 'var(--text2)', fontSize: 10, flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</div>
            </div>
            {isOpen && (
              <div style={{ padding: '10px 14px 12px', borderBottom: !isLast ? '1px solid var(--border)' : 'none', background: 'var(--bg3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {[
                    { label: '输入 Token', value: fmt(m.input) },
                    { label: '输出 Token', value: fmt(m.output) },
                    { label: '缓存读取', value: fmt(m.cacheRead) },
                    { label: '缓存写入', value: fmt(m.cacheCreate) },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

const PRESETS = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '7天', days: 7 },
  { label: '30天', days: 30 },
  { label: '全部', days: 0 },
]

// datetime-local 格式：YYYY-MM-DDTHH:mm
function toLocalDT(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function hoursAgo(h) { const d = new Date(); d.setHours(d.getHours() - h); return toLocalDT(d) }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return toLocalDT(d) }

export default function UsagePage({ projectId, embedded }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState('7天')
  const [since, setSince] = useState(daysAgo(7))
  const [until, setUntil] = useState(toLocalDT(new Date()))
  const [tab, setTab] = useState('model')
  const { showToast } = useToast()

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (since) params.set('since', since)
    if (until) params.set('until', until)
    if (projectId) params.set('projectId', projectId)
    fetch(`/api/usage?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setLoading(false); showToast('加载用量数据失败', 'error') })
  }, [since, until, projectId])

  useEffect(() => { load() }, [load])

  function applyPreset(p) {
    setPreset(p.label)
    if (p.days === 0) { setSince(''); setUntil('') }
    else if (p.hours) { setSince(hoursAgo(p.hours)); setUntil(toLocalDT(new Date())) }
    else { setSince(daysAgo(p.days)); setUntil(toLocalDT(new Date())) }
  }

  const models = [...new Set((data?.timeSeries || []).flatMap(d => Object.keys(d.byModel)))]
  const maxModel = Math.max(...(data?.byModel || []).map(m => m.input + m.output), 1)
  const maxProject = Math.max(...(data?.byProject || []).map(p => p.inputTokens + p.outputTokens), 1)
  const totalTokens = (data?.totalInputTokens || 0) + (data?.totalOutputTokens || 0)

  const page = { flex: 1, overflow: 'auto', padding: embedded ? 0 : 24 }

  return (
    <div style={page}>
      {!embedded && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>用量统计</div>
          <button onClick={load} title="刷新" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18, padding: '4px 8px', borderRadius: 4, opacity: 0.75 }}>↻</button>
        </div>
      )}
      {!embedded && <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>基于本地 Claude Code 会话文件</div>}

      {/* 时间筛选 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)} style={{
              padding: '4px 10px', fontSize: 12, borderRadius: 5, border: '1px solid var(--border)',
              cursor: 'pointer', background: preset === p.label ? 'var(--accent)' : 'var(--bg2)',
              color: preset === p.label ? '#fff' : 'var(--text)'
            }}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
          <input type="datetime-local" value={since} onChange={e => { setSince(e.target.value); setPreset(null) }}
            style={{ padding: '3px 6px', fontSize: 11, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }} />
          <span style={{ color: 'var(--text2)' }}>—</span>
          <input type="datetime-local" value={until} onChange={e => { setUntil(e.target.value); setPreset(null) }}
            style={{ padding: '3px 6px', fontSize: 11, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }} />
        </div>
      </div>

      {loading ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div> : <>

        {/* 汇总卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: '总 Token', value: fmt(totalTokens), sub: `输入 ${fmt(data.totalInputTokens)} · 输出 ${fmt(data.totalOutputTokens)}` },
            { label: '估算费用', value: fmtCost(data.totalCostUSD || 0), sub: '按官方定价' },
            { label: '使用模型', value: (data.byModel || []).length, sub: `${(data.byProject || []).length} 个项目` }
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{c.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* 折线图：始终显示，无数据时显示空坐标轴 */}
        {(
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              Token 用量趋势
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text2)', marginLeft: 6 }}>
                · 按{data.granularity === 'minute' ? '分钟' : data.granularity === 'hour' ? '小时' : '天'}
              </span>
            </div>
            <LineChart series={data.timeSeries || []} models={models} />
            {/* 图例 */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              {models.map(m => (
                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <div style={{ width: 20, height: 2, background: MODEL_COLORS[m] || MODEL_COLORS.default, borderRadius: 1 }} />
                  <span style={{ color: 'var(--text2)' }}>{m.replace('claude-', '')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab（embedded 模式只显示按模型，不显示 Tab 栏） */}
        {!embedded && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
            {[['model', '按模型'], ['project', '按项目']].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: '6px 14px', fontSize: 13, background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === k ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1, color: tab === k ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer'
              }}>{l}</button>
            ))}
          </div>
        )}

        {(embedded || tab === 'model') && (
          <ModelTab byModel={data.byModel || []} maxModel={maxModel} />
        )}

        {!embedded && tab === 'project' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {!(data.byProject || []).length
              ? <div style={{ padding: 20, color: 'var(--text2)', fontSize: 13 }}>暂无数据</div>
              : (data.byProject || []).map((p, i) => {
                  const total = p.inputTokens + p.outputTokens
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < data.byProject.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                      <div style={{ width: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{p.name}</div>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${(total / maxProject) * 100}%`, background: 'var(--accent)', borderRadius: 3 }} />
                      </div>
                      <div style={{ width: 80, textAlign: 'right', color: 'var(--text2)', fontFamily: 'monospace', fontSize: 12, flexShrink: 0 }}>{fmt(total)}</div>
                      <div style={{ width: 60, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, flexShrink: 0 }}>{fmtCost(p.cost)}</div>
                    </div>
                  )
                })
            }
          </div>
        )}
      </>}
    </div>
  )
}
