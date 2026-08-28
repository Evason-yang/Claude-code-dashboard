// server/autostart.js
import { existsSync, writeFileSync, mkdirSync, unlinkSync, chmodSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HOME = os.homedir()
const PORT = process.env.PORT || 3000
// 启动命令：用 node 直接运行 server/index.js
const NODE_BIN = process.execPath
const SERVER_PATH = join(__dirname, 'index.js')
const INSTALL_DIR = join(__dirname, '..')

// ── macOS ─────────────────────────────────────────────────────────────────────
const PLIST_PATH = join(HOME, 'Library', 'LaunchAgents', 'com.claudedashboard.plist')
const WRAPPER_PATH = join(HOME, '.claude', 'claude-dashboard-launch.sh')

// 生成启动脚本：动态查找 node（PATH → nvm default → nvm 最新版 → Homebrew → 启用时的路径）
// 避免把 node 绝对路径写死在 plist 里，node 升级/切换版本后依然可用
function macosWriteWrapper() {
  mkdirSync(join(HOME, '.claude'), { recursive: true })
  const script = `#!/usr/bin/env bash
# 由 Claude Dashboard 自动生成，请勿手动编辑
NODE_BIN=""
command -v node >/dev/null 2>&1 && NODE_BIN="$(command -v node)"

if [ -z "$NODE_BIN" ] && [ -s "$HOME/.nvm/alias/default" ]; then
  v="$(tr -d '[:space:]' < "$HOME/.nvm/alias/default")"
  case "$v" in
    v[0-9]*|[0-9]*)
      candidate="$HOME/.nvm/versions/node/v\${v#v}/bin/node"
      [ -x "$candidate" ] && NODE_BIN="$candidate"
      ;;
  esac
fi

if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(ls -d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null \\
    | sed 's|.*/node/v\\([0-9][0-9]*\\)\\.\\([0-9][0-9]*\\)\\.\\([0-9][0-9]*\\)/bin/node|\\1.\\2.\\3 &|' \\
    | sort -t. -k1,1n -k2,2n -k3,3n | tail -1 | cut -d' ' -f2-)"
fi

if [ -z "$NODE_BIN" ] && [ -x "/opt/homebrew/bin/node" ]; then
  NODE_BIN="/opt/homebrew/bin/node"
fi
if [ -z "$NODE_BIN" ] && [ -x "/usr/local/bin/node" ]; then
  NODE_BIN="/usr/local/bin/node"
fi
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="${NODE_BIN}"
fi

exec "$NODE_BIN" "${SERVER_PATH}"
`
  writeFileSync(WRAPPER_PATH, script, 'utf8')
  chmodSync(WRAPPER_PATH, 0o755)
}

function macosIsEnabled() {
  return existsSync(PLIST_PATH)
}

function macosEnable() {
  mkdirSync(join(HOME, 'Library', 'LaunchAgents'), { recursive: true })
  macosWriteWrapper()
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claudedashboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>${WRAPPER_PATH}</string>
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
  // 服务已在运行时跳过 load（避免端口冲突启动第二个实例），下次开机自动生效
  let running = false
  try { execSync(`curl -s --max-time 1 http://localhost:${PORT} > /dev/null 2>&1`); running = true } catch {}
  if (!running) {
    try { execSync(`launchctl load "${PLIST_PATH}"`) } catch {}
  }
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
