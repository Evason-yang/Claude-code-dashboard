// server/autostart.js
import { existsSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HOME = os.homedir()
// 启动命令：用 node 直接运行 server/index.js
const NODE_BIN = process.execPath
const SERVER_PATH = join(__dirname, 'index.js')
const INSTALL_DIR = join(__dirname, '..')

// ── macOS ─────────────────────────────────────────────────────────────────────
const PLIST_PATH = join(HOME, 'Library', 'LaunchAgents', 'com.claudedashboard.plist')

function macosIsEnabled() {
  return existsSync(PLIST_PATH)
}

function macosEnable() {
  mkdirSync(join(HOME, 'Library', 'LaunchAgents'), { recursive: true })
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claudedashboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${SERVER_PATH}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${INSTALL_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${HOME}/.claude/dashboard.log</string>
  <key>StandardErrorPath</key>
  <string>${HOME}/.claude/dashboard-error.log</string>
</dict>
</plist>`
  writeFileSync(PLIST_PATH, plist, 'utf8')
  try { execSync(`launchctl load "${PLIST_PATH}"`) } catch {}
}

function macosDisable() {
  if (existsSync(PLIST_PATH)) {
    try { execSync(`launchctl unload "${PLIST_PATH}"`) } catch {}
    unlinkSync(PLIST_PATH)
  }
}

// ── Windows ───────────────────────────────────────────────────────────────────
const REG_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
const REG_NAME = 'ClaudeDashboard'

function winIsEnabled() {
  try {
    const out = execSync(`reg query "${REG_KEY}" /v "${REG_NAME}" 2>nul`, { encoding: 'utf8' })
    return out.includes(REG_NAME)
  } catch {
    return false
  }
}

function winEnable() {
  const cmd = `"${NODE_BIN}" "${SERVER_PATH}"`
  execSync(`reg add "${REG_KEY}" /v "${REG_NAME}" /t REG_SZ /d "${cmd}" /f`)
}

function winDisable() {
  try {
    execSync(`reg delete "${REG_KEY}" /v "${REG_NAME}" /f 2>nul`)
  } catch {}
}

// ── Linux ─────────────────────────────────────────────────────────────────────
const AUTOSTART_DIR = join(HOME, '.config', 'autostart')
const DESKTOP_PATH = join(AUTOSTART_DIR, 'claude-dashboard.desktop')

function linuxIsEnabled() {
  return existsSync(DESKTOP_PATH)
}

function linuxEnable() {
  mkdirSync(AUTOSTART_DIR, { recursive: true })
  const content = `[Desktop Entry]
Type=Application
Name=Claude Dashboard
Exec=${NODE_BIN} ${SERVER_PATH}
Path=${INSTALL_DIR}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
`
  writeFileSync(DESKTOP_PATH, content, 'utf8')
}

function linuxDisable() {
  if (existsSync(DESKTOP_PATH)) unlinkSync(DESKTOP_PATH)
}

// ── 公开 API ──────────────────────────────────────────────────────────────────
export function isEnabled() {
  if (process.platform === 'darwin') return macosIsEnabled()
  if (process.platform === 'win32') return winIsEnabled()
  return linuxIsEnabled()
}

export function enable() {
  if (process.platform === 'darwin') macosEnable()
  else if (process.platform === 'win32') winEnable()
  else linuxEnable()
}

export function disable() {
  if (process.platform === 'darwin') macosDisable()
  else if (process.platform === 'win32') winDisable()
  else linuxDisable()
}
