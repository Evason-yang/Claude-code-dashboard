import { readdirSync, readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { getClaudeProjectDir } from './sessions.js'

export function searchSessions(projectPath, query, limit = 200) {
  if (!query || query.trim().length < 1) return []
  const dir = getClaudeProjectDir(projectPath)
  if (!existsSync(dir)) return []

  const q = query.toLowerCase()
  const results = []

  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'))
    for (const f of files) {
      const sessionId = basename(f, '.jsonl')
      const lines = readFileSync(join(dir, f), 'utf8').trim().split('\n')
      const matches = []
      let sessionTitle = '（无内容）'
      let sessionTs = null

      for (const line of lines) {
        try {
          const obj = JSON.parse(line)
          const msg = obj.message || {}
          const ts = obj.timestamp
          if (!sessionTs && ts) sessionTs = ts

          // 提取文本内容
          let text = ''
          if (typeof msg.content === 'string') text = msg.content
          else if (Array.isArray(msg.content)) {
            text = msg.content.filter(b => b.type === 'text').map(b => b.text).join(' ')
          }
          if (!text) continue

          // 设置会话标题（第一条用户消息）
          if (msg.role === 'user' && sessionTitle === '（无内容）' && text.trim()) {
            sessionTitle = text.slice(0, 60)
          }

          // 全文匹配
          if (text.toLowerCase().includes(q)) {
            // 提取匹配片段（前后各 60 字符）
            const idx = text.toLowerCase().indexOf(q)
            const start = Math.max(0, idx - 120)
            const end = Math.min(text.length, idx + query.length + 120)
            const snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '')
            matches.push({ role: msg.role, snippet, timestamp: ts })
          }
        } catch (e) { console.error('[warn]', e.message) }
      }

      if (matches.length > 0) {
        results.push({
          sessionId,
          title: sessionTitle,
          sessionTs,
          matchCount: matches.length,
          matches: matches.slice(0, 5)  // 每个会话最多返回 5 条匹配片段
        })
      }

      if (results.length >= limit) break
    }
  } catch (e) { console.error('[warn]', e.message) }

  // 按匹配数降序排列
  return results.sort((a, b) => b.matchCount - a.matchCount)
}

// 全局搜索：跨所有项目，结果按项目分组
export function searchAllSessions(projects, query, limitPerProject = 50) {
  if (!query || query.trim().length < 1) return []
  const grouped = []
  for (const proj of projects) {
    const results = searchSessions(proj.path, query, limitPerProject)
    if (results.length > 0) {
      grouped.push({ id: proj.id, name: proj.name, path: proj.path, results })
    }
  }
  // 按各项目总匹配数降序
  return grouped.sort((a, b) =>
    b.results.reduce((s, r) => s + r.matchCount, 0) -
    a.results.reduce((s, r) => s + r.matchCount, 0)
  )
}
