import React, { useEffect, useState } from 'react'

const S = {
  empty: { color: 'var(--text2)', fontSize: 13, padding: '20px 0' },
  item: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 },
  hash: { fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)', flexShrink: 0, width: 56 },
  message: { flex: 1, color: 'var(--text)' },
  meta: { fontSize: 11, color: 'var(--text2)', flexShrink: 0 }
}

export default function GitLog({ project, refreshKey }) {
  const [commits, setCommits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/projects/${project.id}/git`)
      .then(r => r.json())
      .then(data => { setCommits(data); setLoading(false) })
  }, [project.id, refreshKey])

  if (loading) return <div style={S.empty}>加载中...</div>
  if (commits.length === 0) return <div style={S.empty}>此项目未初始化 git 仓库或暂无提交记录</div>

  return (
    <div>
      {commits.map((c, i) => (
        <div key={i} style={S.item}>
          <span style={S.hash}>{c.hash}</span>
          <span style={S.message}>{c.message}</span>
          <span style={S.meta}>{c.author} · {c.relativeTime}</span>
        </div>
      ))}
    </div>
  )
}
