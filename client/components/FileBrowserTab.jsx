import React, { useEffect, useState, useCallback } from 'react'
import hljs from 'highlight.js/lib/core'
import { marked } from 'marked'

// 只注册常用语言，减小 bundle 体积
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'  // html/xml/vue
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import yaml from 'highlight.js/lib/languages/yaml'
import sql from 'highlight.js/lib/languages/sql'
import markdown from 'highlight.js/lib/languages/markdown'
import cpp from 'highlight.js/lib/languages/cpp'
import ruby from 'highlight.js/lib/languages/ruby'
import php from 'highlight.js/lib/languages/php'
import kotlin from 'highlight.js/lib/languages/kotlin'
import swift from 'highlight.js/lib/languages/swift'
import ini from 'highlight.js/lib/languages/ini'  // toml/ini

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('php', php)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('toml', ini)

import 'highlight.js/styles/github-dark.css'

// ── 文件类型配置 ─────────────────────────────────────────────────────────────

const FILE_ICONS = {
  js: '📄', jsx: '⚛', ts: '📘', tsx: '⚛',
  json: '{}', md: '📝', txt: '📄', sh: '⚙',
  py: '🐍', go: '🐹', java: '☕', css: '🎨',
  html: '🌐', xml: '📋', yml: '⚙', yaml: '⚙',
  env: '🔑', sql: '🗄', rs: '🦀', rb: '💎',
  php: '🐘', swift: '🍎', kt: '🎯', vue: '💚',
  png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', svg: '🖼', ico: '🖼',
  mp4: '🎬', mp3: '🎵', pdf: '📑',
  zip: '📦', tar: '📦', gz: '📦',
  lock: '🔒', gitignore: '🚫',
}

const EXT_LANG = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  py: 'python', go: 'go', java: 'java', css: 'css', html: 'html',
  json: 'json', sh: 'bash', bash: 'bash', zsh: 'bash',
  yml: 'yaml', yaml: 'yaml', xml: 'xml', sql: 'sql',
  rs: 'rust', cpp: 'cpp', c: 'c', rb: 'ruby', php: 'php',
  swift: 'swift', kt: 'kotlin', vue: 'html', md: 'markdown',
  toml: 'toml', ini: 'ini', dockerfile: 'dockerfile',
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp'])
const BINARY_EXTS = new Set(['pdf', 'zip', 'tar', 'gz', 'mp4', 'mp3', 'wasm', 'exe', 'bin', 'dmg', 'pkg'])

function getExt(name) {
  if (!name.includes('.')) return ''
  return name.split('.').pop().toLowerCase()
}

function getIcon(name, type) {
  if (type === 'dir') return '📁'
  const ext = getExt(name)
  return FILE_ICONS[ext] || '📄'
}

function fileType(name) {
  const ext = getExt(name)
  if (ext === 'md') return 'markdown'
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (BINARY_EXTS.has(ext)) return 'binary'
  return 'code'
}

// ── 目录树 ───────────────────────────────────────────────────────────────────

function TreeNode({ item, depth, selectedPath, onSelect, onToggle, openDirs, dirCache }) {
  const isDir = item.type === 'dir'
  const isOpen = openDirs.has(item.path)
  const isSelected = selectedPath === item.path
  const children = isDir && isOpen ? (dirCache[item.path] || []) : []

  return (
    <div>
      <div
        onClick={() => isDir ? onToggle(item.path) : onSelect(item)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', paddingLeft: 8 + depth * 14,
          cursor: 'pointer', fontSize: 12, userSelect: 'none',
          background: isSelected ? 'var(--accent)22' : 'none',
          borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
          color: isSelected ? 'var(--accent)' : 'var(--text)',
        }}
      >
        <span style={{ fontSize: 9, color: 'var(--text2)', width: 10, flexShrink: 0 }}>
          {isDir ? (isOpen ? '▼' : '▶') : ''}
        </span>
        <span style={{ fontSize: 13, flexShrink: 0 }}>{getIcon(item.name, item.type)}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </span>
      </div>
      {isDir && isOpen && children.map(child => (
        <TreeNode key={child.path} item={child} depth={depth + 1}
          selectedPath={selectedPath} onSelect={onSelect}
          onToggle={onToggle} openDirs={openDirs} dirCache={dirCache} />
      ))}
    </div>
  )
}

// ── Markdown 预览 ─────────────────────────────────────────────────────────────

function MarkdownPreview({ content }) {
  const html = marked(content, { breaks: true, gfm: true })
  return (
    <div
      className="md-preview"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        padding: '20px 24px', fontSize: 14, lineHeight: 1.8,
        color: 'var(--text)', maxWidth: 860,
      }}
    />
  )
}

// ── 代码高亮 ──────────────────────────────────────────────────────────────────

function CodeView({ content, filename }) {
  const ext = getExt(filename)
  const lang = EXT_LANG[ext]

  let highlighted
  try {
    highlighted = lang
      ? hljs.highlight(content, { language: lang, ignoreIllegals: true }).value
      : hljs.highlightAuto(content).value
  } catch {
    highlighted = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  const lines = highlighted.split('\n')

  return (
    <div style={{ display: 'flex', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12, lineHeight: 1.65 }}>
      {/* 行号 */}
      <div style={{ padding: '14px 10px 14px 14px', textAlign: 'right', color: 'var(--text2)', userSelect: 'none', borderRight: '1px solid var(--border)', minWidth: 44, flexShrink: 0, opacity: 0.5 }}>
        {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      {/* 代码 */}
      <pre
        className="hljs"
        style={{ margin: 0, padding: '14px 16px', flex: 1, overflow: 'visible', background: 'transparent', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  )
}

// ── 图片预览 ──────────────────────────────────────────────────────────────────

function ImageView({ projectId, filePath }) {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
      <img
        src={`/api/projects/${projectId}/file-raw?path=${encodeURIComponent(filePath)}`}
        alt={filePath}
        style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 6, border: '1px solid var(--border)' }}
      />
      <div style={{ fontSize: 11, color: 'var(--text2)' }}>{filePath}</div>
    </div>
  )
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

export default function FileBrowserTab({ project }) {
  const [dirCache, setDirCache] = useState({})
  const [openDirs, setOpenDirs] = useState(new Set())
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState(null)   // null | 'loading' | string
  const [mdMode, setMdMode] = useState('preview')        // 'preview' | 'source' | 'split'

  // 加载目录
  const loadDir = useCallback(async (dirPath) => {
    if (dirCache[dirPath] !== undefined) return
    try {
      const qs = dirPath ? `?path=${encodeURIComponent(dirPath)}` : ''
      const res = await fetch(`/api/projects/${project.id}/files${qs}`)
      const items = await res.json()
      setDirCache(prev => ({ ...prev, [dirPath]: Array.isArray(items) ? items : [] }))
    } catch {
      setDirCache(prev => ({ ...prev, [dirPath]: [] }))
    }
  }, [project.id, dirCache])

  useEffect(() => { loadDir('') }, [project.id])

  async function handleToggle(dirPath) {
    setOpenDirs(prev => {
      const next = new Set(prev)
      next.has(dirPath) ? next.delete(dirPath) : next.add(dirPath)
      return next
    })
    await loadDir(dirPath)
  }

  async function handleSelect(item) {
    setSelectedFile(item)
    setMdMode('preview')
    const ftype = fileType(item.name)
    if (ftype === 'binary') { setFileContent('__binary__'); return }
    if (ftype === 'image') { setFileContent('__image__'); return }
    setFileContent('loading')
    try {
      const res = await fetch(`/api/projects/${project.id}/file?path=${encodeURIComponent(item.path)}`)
      const data = await res.json()
      setFileContent(data.error ? `// 无法读取：${data.error}` : data.content)
    } catch {
      setFileContent('// 读取失败')
    }
  }

  const rootItems = dirCache[''] || []
  const ftype = selectedFile ? fileType(selectedFile.name) : null

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── 左侧目录树 ── */}
      <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg2)', paddingTop: 6, paddingBottom: 12 }}>
        <div style={{ padding: '0 8px 6px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {project.name}
        </div>
        {rootItems.length === 0
          ? <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text2)' }}>加载中...</div>
          : rootItems.map(item => (
            <TreeNode key={item.path} item={item} depth={0}
              selectedPath={selectedFile?.path}
              onSelect={handleSelect} onToggle={handleToggle}
              openDirs={openDirs} dirCache={dirCache} />
          ))
        }
      </div>

      {/* ── 右侧预览 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {!selectedFile ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>
            选择左侧文件预览内容
          </div>
        ) : (
          <>
            {/* 顶部栏 */}
            <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>{getIcon(selectedFile.name, 'file')}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{selectedFile.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedFile.path}
              </span>

              {/* Markdown 模式切换 */}
              {ftype === 'markdown' && (
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  {[['preview', '预览'], ['split', '分栏'], ['source', '源码']].map(([mode, label]) => (
                    <button key={mode} onClick={() => setMdMode(mode)} style={{
                      padding: '3px 9px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                      border: '1px solid var(--border)',
                      background: mdMode === mode ? 'var(--accent)' : 'var(--bg3)',
                      color: mdMode === mode ? '#fff' : 'var(--text2)',
                    }}>{label}</button>
                  ))}
                </div>
              )}
            </div>

            {/* 内容区 */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
              {fileContent === 'loading' && (
                <div style={{ padding: 16, color: 'var(--text2)', fontSize: 13 }}>加载中...</div>
              )}

              {fileContent === '__binary__' && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text2)' }}>
                  <span style={{ fontSize: 36 }}>📦</span>
                  <span style={{ fontSize: 13 }}>二进制文件，无法预览</span>
                </div>
              )}

              {fileContent === '__image__' && (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <ImageView projectId={project.id} filePath={selectedFile.path} />
                </div>
              )}

              {ftype === 'markdown' && fileContent && fileContent !== 'loading' && fileContent !== '__binary__' && fileContent !== '__image__' && (
                <>
                  {mdMode === 'preview' && (
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      <MarkdownPreview content={fileContent} />
                    </div>
                  )}
                  {mdMode === 'source' && (
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      <CodeView content={fileContent} filename={selectedFile.name} />
                    </div>
                  )}
                  {mdMode === 'split' && (
                    <>
                      <div style={{ flex: 1, overflow: 'auto', borderRight: '1px solid var(--border)' }}>
                        <CodeView content={fileContent} filename={selectedFile.name} />
                      </div>
                      <div style={{ flex: 1, overflow: 'auto' }}>
                        <MarkdownPreview content={fileContent} />
                      </div>
                    </>
                  )}
                </>
              )}

              {ftype === 'code' && fileContent && fileContent !== 'loading' && (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <CodeView content={fileContent} filename={selectedFile.name} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Markdown 预览样式 */}
      <style>{`
        .md-preview h1,.md-preview h2,.md-preview h3,.md-preview h4 { color: var(--text); margin: 1.2em 0 0.4em; font-weight: 600; }
        .md-preview h1 { font-size: 1.6em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
        .md-preview h2 { font-size: 1.3em; border-bottom: 1px solid var(--border); padding-bottom: 0.2em; }
        .md-preview h3 { font-size: 1.1em; }
        .md-preview p { margin: 0.6em 0; }
        .md-preview a { color: var(--accent); text-decoration: none; }
        .md-preview a:hover { text-decoration: underline; }
        .md-preview code { background: var(--bg3); padding: 2px 5px; border-radius: 3px; font-family: ui-monospace,monospace; font-size: 0.88em; }
        .md-preview pre { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; overflow-x: auto; margin: 0.8em 0; }
        .md-preview pre code { background: none; padding: 0; font-size: 0.85em; }
        .md-preview blockquote { border-left: 3px solid var(--accent); margin: 0.6em 0; padding: 4px 14px; color: var(--text2); background: var(--bg2); border-radius: 0 4px 4px 0; }
        .md-preview ul,.md-preview ol { padding-left: 1.6em; margin: 0.4em 0; }
        .md-preview li { margin: 0.2em 0; }
        .md-preview table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 13px; }
        .md-preview th,.md-preview td { border: 1px solid var(--border); padding: 6px 12px; text-align: left; }
        .md-preview th { background: var(--bg3); font-weight: 600; }
        .md-preview tr:nth-child(even) { background: var(--bg2); }
        .md-preview img { max-width: 100%; border-radius: 4px; }
        .md-preview hr { border: none; border-top: 1px solid var(--border); margin: 1.2em 0; }
        .hljs { background: transparent !important; }
      `}</style>
    </div>
  )
}
