import React, { useEffect, useState, useCallback } from 'react'

const FILE_ICONS = {
  js: '📄', jsx: '⚛', ts: '📘', tsx: '⚛', json: '{}',
  md: '📝', txt: '📄', sh: '⚙', py: '🐍', go: '🐹',
  java: '☕', css: '🎨', html: '🌐', xml: '📋', yml: '⚙',
  yaml: '⚙', env: '🔑', gitignore: '🚫', lock: '🔒',
  png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', svg: '🖼',
  mp4: '🎬', mp3: '🎵', zip: '📦', tar: '📦', gz: '📦',
}

function getIcon(name, type) {
  if (type === 'dir') return '📁'
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  return FILE_ICONS[ext] || '📄'
}

function TreeNode({ item, depth, selectedPath, onSelect, onToggle, openDirs }) {
  const isDir = item.type === 'dir'
  const isOpen = openDirs.has(item.path)
  const isSelected = selectedPath === item.path
  const children = item.children || []

  return (
    <div>
      <div
        onClick={() => isDir ? onToggle(item.path) : onSelect(item)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px 3px', paddingLeft: 8 + depth * 14,
          cursor: 'pointer', fontSize: 12, userSelect: 'none',
          background: isSelected ? 'var(--accent)22' : 'none',
          borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
          color: isSelected ? 'var(--accent)' : 'var(--text)',
          borderRadius: 2,
        }}
      >
        {isDir && (
          <span style={{ fontSize: 9, color: 'var(--text2)', width: 10, flexShrink: 0 }}>
            {isOpen ? '▼' : '▶'}
          </span>
        )}
        {!isDir && <span style={{ width: 10, flexShrink: 0 }} />}
        <span style={{ fontSize: 13, flexShrink: 0 }}>{getIcon(item.name, item.type)}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </span>
      </div>
      {isDir && isOpen && children.map(child => (
        <TreeNode
          key={child.path}
          item={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onToggle={onToggle}
          openDirs={openDirs}
        />
      ))}
    </div>
  )
}

function getLanguage(filename) {
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''
  const map = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', go: 'go', java: 'java', css: 'css', html: 'html',
    json: 'json', md: 'markdown', sh: 'bash', yml: 'yaml', yaml: 'yaml',
    xml: 'xml', sql: 'sql', rs: 'rust', cpp: 'cpp', c: 'c', rb: 'ruby',
  }
  return map[ext] || 'plaintext'
}

export default function FileBrowserTab({ project }) {
  const [tree, setTree] = useState([])      // 根目录列表
  const [dirCache, setDirCache] = useState({ '': null })  // path → children
  const [openDirs, setOpenDirs] = useState(new Set())
  const [selectedFile, setSelectedFile] = useState(null)  // { path, name }
  const [fileContent, setFileContent] = useState(null)    // string | null | 'loading' | 'error'
  const [loadingDir, setLoadingDir] = useState(null)

  // 加载目录
  const loadDir = useCallback(async (dirPath) => {
    if (dirCache[dirPath] !== undefined && dirCache[dirPath] !== null) return
    setLoadingDir(dirPath)
    try {
      const url = `/api/projects/${project.id}/files${dirPath ? `?path=${encodeURIComponent(dirPath)}` : ''}`
      const res = await fetch(url)
      const items = await res.json()
      setDirCache(prev => ({ ...prev, [dirPath]: Array.isArray(items) ? items : [] }))
    } catch {
      setDirCache(prev => ({ ...prev, [dirPath]: [] }))
    } finally {
      setLoadingDir(null)
    }
  }, [project.id, dirCache])

  // 初始加载根目录
  useEffect(() => {
    fetch(`/api/projects/${project.id}/files`)
      .then(r => r.json())
      .then(items => {
        setDirCache({ '': Array.isArray(items) ? items : [] })
        setTree(Array.isArray(items) ? items : [])
      })
  }, [project.id])

  // 目录展开/折叠
  async function handleToggle(dirPath) {
    setOpenDirs(prev => {
      const next = new Set(prev)
      if (next.has(dirPath)) { next.delete(dirPath); return next }
      next.add(dirPath)
      return next
    })
    if (dirCache[dirPath] === undefined) {
      await loadDir(dirPath)
    }
  }

  // 点击文件
  async function handleSelect(item) {
    setSelectedFile(item)
    setFileContent('loading')
    try {
      const res = await fetch(`/api/projects/${project.id}/file?path=${encodeURIComponent(item.path)}`)
      const data = await res.json()
      if (data.error) setFileContent(`// 无法读取文件：${data.error}`)
      else setFileContent(data.content)
    } catch {
      setFileContent('// 读取失败')
    }
  }

  // 把 dirCache 注入到 tree 节点
  function buildTree(items, depth = 0) {
    return items.map(item => {
      if (item.type === 'dir') {
        const children = dirCache[item.path]
        return {
          ...item,
          children: children ? buildTree(children, depth + 1) : [],
        }
      }
      return item
    })
  }

  const rootItems = dirCache[''] || []
  const builtTree = buildTree(rootItems)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* 左侧目录树 */}
      <div style={{
        width: 240, flexShrink: 0, borderRight: '1px solid var(--border)',
        overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg2)',
        paddingTop: 6, paddingBottom: 12,
      }}>
        <div style={{ padding: '0 8px 6px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {project.name}
        </div>
        {builtTree.length === 0 ? (
          <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text2)' }}>加载中...</div>
        ) : (
          builtTree.map(item => (
            <TreeNode
              key={item.path}
              item={item}
              depth={0}
              selectedPath={selectedFile?.path}
              onSelect={handleSelect}
              onToggle={handleToggle}
              openDirs={openDirs}
            />
          ))
        )}
      </div>

      {/* 右侧预览 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        {!selectedFile ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>
            选择左侧文件预览内容
          </div>
        ) : (
          <>
            {/* 文件路径栏 */}
            <div style={{ padding: '7px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 13 }}>{getIcon(selectedFile.name, 'file')}</span>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{selectedFile.name}</span>
              <span style={{ color: 'var(--text2)' }}>·</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{selectedFile.path}</span>
            </div>
            {/* 内容区 */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {fileContent === 'loading' ? (
                <div style={{ padding: 16, color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
              ) : (
                <pre style={{
                  margin: 0, padding: '14px 16px',
                  fontSize: 12, lineHeight: 1.65,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  tabSize: 2,
                }}>
                  {fileContent}
                </pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
