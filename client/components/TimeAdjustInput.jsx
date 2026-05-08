import React from 'react'

// 通用时间调整输入框
// type: 'date' | 'datetime-local'
// value / onChange: 同原生 input
// steps: [{ label, minutes }]  minutes 可正可负
export default function TimeAdjustInput({ type, value, onChange, steps }) {
  function adjust(minutes) {
    if (!value) return
    const date = new Date(type === 'date' ? value + 'T00:00' : value)
    if (isNaN(date)) return
    date.setMinutes(date.getMinutes() + minutes)
    onChange(fmt(date, type))
  }

  const negSteps = steps.filter(s => s.minutes < 0).reverse()  // 从大到小：-1d -1h -30m
  const posSteps = steps.filter(s => s.minutes > 0)            // 从小到大：+30m +1h +1d

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {negSteps.map(s => (
        <button key={s.label} onClick={() => adjust(s.minutes)} title={s.label} style={btnStyle}>
          {s.label}
        </button>
      ))}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ padding: '3px 6px', fontSize: 11, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', outline: 'none' }}
      />
      {posSteps.map(s => (
        <button key={s.label} onClick={() => adjust(s.minutes)} title={s.label} style={btnStyle}>
          {s.label}
        </button>
      ))}
    </div>
  )
}

const btnStyle = {
  padding: '2px 6px', fontSize: 10, borderRadius: 4,
  border: '1px solid var(--border)', background: 'var(--bg3)',
  color: 'var(--text2)', cursor: 'pointer', lineHeight: 1.6,
  whiteSpace: 'nowrap',
}

function fmt(date, type) {
  const pad = n => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const mo = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  if (type === 'date') return `${y}-${mo}-${d}`
  const h = pad(date.getHours())
  const m = pad(date.getMinutes())
  return `${y}-${mo}-${d}T${h}:${m}`
}
