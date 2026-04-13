import React, { useEffect, useState } from 'react'

export default function SkillsTab({ refreshKey }) {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/skills/all')
      .then(r => r.json())
      .then(data => { setSkills(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [refreshKey])

  if (loading) return <div style={{ color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
  if (!skills.length) return <div style={{ color: 'var(--text2)', fontSize: 13 }}>未发现可用 Skill</div>

  // 按插件分组
  const byPlugin = {}
  for (const s of skills) {
    const key = s.plugin || 'other'
    if (!byPlugin[key]) byPlugin[key] = []
    byPlugin[key].push(s)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--text2)' }}>共 {skills.length} 个可用 Skill</div>
      {Object.entries(byPlugin).map(([plugin, list]) => (
        <div key={plugin}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            {plugin.replace('local:', '').replace('@', ' · ')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {list.map(s => (
              <span
                key={s.id}
                title={s.description}
                style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 4,
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  color: 'var(--accent)', fontFamily: 'monospace', cursor: 'default',
                  lineHeight: 1.6
                }}
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
