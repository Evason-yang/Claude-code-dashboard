// scripts/setup-desktop.js
import { existsSync, writeFileSync, mkdirSync, chmodSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HOME = os.homedir()
const INSTALL_DIR = join(__dirname, '..')
const NODE_BIN = process.execPath
const SERVER_PATH = join(INSTALL_DIR, 'server', 'index.js')
const PORT = 3000

// ── macOS：创建 .app Bundle ──────────────────────────────────────────────────
function setupMac() {
  const appPath = '/Applications/Claude Dashboard.app'
  const contentsDir = join(appPath, 'Contents')
  const macOSDir = join(contentsDir, 'MacOS')

  // 移除旧的桌面图标（如果存在）
  const oldAppPath = join(HOME, 'Desktop', 'Claude Dashboard.app')
  if (existsSync(oldAppPath)) {
    execSync(`rm -rf "${oldAppPath}"`)
  }

  mkdirSync(macOSDir, { recursive: true })

  writeFileSync(join(contentsDir, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>launcher</string>
  <key>CFBundleName</key>
  <string>Claude Dashboard</string>
  <key>CFBundleIdentifier</key>
  <string>com.claudedashboard</string>
  <key>CFBundleVersion</key>
  <string>1.0</string>
</dict>
</plist>
`)

  const launcher = join(macOSDir, 'launcher')
  writeFileSync(launcher, `#!/usr/bin/env bash
if curl -s --max-time 1 http://localhost:${PORT} >/dev/null 2>&1; then
  open "http://localhost:${PORT}"
else
  cd "${INSTALL_DIR}"
  "${NODE_BIN}" "${SERVER_PATH}" &
fi
`)
  chmodSync(launcher, 0o755)
  console.log(`✅ 应用已安装：${appPath}`)
}

// ── Windows：创建 .lnk 快捷方式 ──────────────────────────────────────────────
function setupWindows() {
  const desktopPath = join(HOME, 'Desktop', 'Claude Dashboard.lnk')
  const launcherBat = join(INSTALL_DIR, 'launch.bat')

  writeFileSync(launcherBat, `@echo off
powershell -command "try { $r = Invoke-WebRequest -Uri http://localhost:${PORT} -TimeoutSec 1 -UseBasicParsing; Start-Process 'http://localhost:${PORT}' } catch { Start-Process '${NODE_BIN}' -ArgumentList '${SERVER_PATH}' -WorkingDirectory '${INSTALL_DIR}' }"
`)

  const escapedDesktopPath = desktopPath.replace(/\\/g, '\\\\')
  const escapedBatPath = launcherBat.replace(/\\/g, '\\\\')
  const escapedInstallDir = INSTALL_DIR.replace(/\\/g, '\\\\')
  const ps = `$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('${escapedDesktopPath}'); $s.TargetPath = '${escapedBatPath}'; $s.WorkingDirectory = '${escapedInstallDir}'; $s.Description = 'Claude Code Dashboard'; $s.Save()`
  try {
    execSync(`powershell -Command "${ps.replace(/"/g, '\\"')}"`)
    console.log(`✅ 桌面图标已创建：${desktopPath}`)
  } catch (e) {
    console.warn('⚠️  创建 Windows 快捷方式失败:', e.message)
  }
}

// ── Linux：创建 .desktop 文件 ─────────────────────────────────────────────────
function setupLinux() {
  const launcherSh = join(INSTALL_DIR, 'launch.sh')
  writeFileSync(launcherSh, `#!/usr/bin/env bash
if curl -s --max-time 1 http://localhost:${PORT} >/dev/null 2>&1; then
  xdg-open "http://localhost:${PORT}"
else
  cd "${INSTALL_DIR}"
  "${NODE_BIN}" "${SERVER_PATH}" &
fi
`)
  chmodSync(launcherSh, 0o755)

  const desktopDir = join(HOME, 'Desktop')
  mkdirSync(desktopDir, { recursive: true })
  const desktopPath = join(desktopDir, 'claude-dashboard.desktop')
  writeFileSync(desktopPath, `[Desktop Entry]
Version=1.0
Type=Application
Name=Claude Dashboard
Comment=Claude Code Dashboard
Exec=${launcherSh}
Path=${INSTALL_DIR}
Terminal=false
Categories=Development;
`)
  try { chmodSync(desktopPath, 0o755) } catch {}
  console.log(`✅ 桌面图标已创建：${desktopPath}`)
}

// ── 入口 ──────────────────────────────────────────────────────────────────────
const p = process.platform
if (p === 'darwin') setupMac()
else if (p === 'win32') setupWindows()
else setupLinux()
