import React, { useState } from 'react'

// 文件路径提示标签，支持点击复制
export default function PathBadge({ path, exists = true, label = null }) {
  const [copied, setCopied] = useState(false)

  function copy(e) {
    e.stopPropagation()
    navigator.clipboard.writeText(path)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span
      onClick={copy}
      title={`点击复制路径：${path}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 11, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
        background: 'var(--bg3)', border: '1px solid var(--border)',
        color: copied ? 'var(--accent)' : exists ? 'var(--text2)' : '#f0883e',
        transition: 'color 0.15s',
      }}
    >
      <span>{exists ? '📄' : '✦'}</span>
      <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
        {label || path}
      </code>
      <span style={{ opacity: 0.6 }}>{copied ? '✓' : '⎘'}</span>
    </span>
  )
}
