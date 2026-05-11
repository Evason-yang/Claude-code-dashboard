// server/updater.js
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function getLocalVersion() {
  try {
    return JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')).version
  } catch {
    return '0.0.0'
  }
}

// 返回 { local, latest, hasUpdate } 或 { local, latest: null, hasUpdate: false }（网络失败）
export async function checkUpdate() {
  const local = getLocalVersion()
  try {
    const res = await fetch(
      'https://api.github.com/repos/Evason-yang/Claude-code-dashboard/releases/latest',
      { headers: { 'User-Agent': 'claude-code-dashboard' }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return { local, latest: null, hasUpdate: false }
    const data = await res.json()
    const latest = (data.tag_name || '').replace(/^v/, '')
    const hasUpdate = Boolean(latest && latest !== local)
    return { local, latest, hasUpdate }
  } catch {
    return { local, latest: null, hasUpdate: false }
  }
}

// 在当前工作目录执行更新（git pull + npm install + npm run build）
// 返回 { ok: true } 或 { ok: false, error: string }
export function runUpdate() {
  const cwd = join(__dirname, '..')
  try {
    execSync('git pull --ff-only', { cwd, stdio: 'inherit' })
    execSync('npm install --silent', { cwd, stdio: 'inherit' })
    execSync('npm run build --silent', { cwd, stdio: 'inherit' })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}
