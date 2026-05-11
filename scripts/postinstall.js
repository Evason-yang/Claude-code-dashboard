// scripts/postinstall.js
// npm install 完成后自动修复 systray2 二进制文件权限
import { chmodSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const bins = [
  join(root, 'node_modules/systray2/traybin/tray_darwin_release'),
  join(root, 'node_modules/systray2/traybin/tray_linux_release'),
]

for (const bin of bins) {
  if (existsSync(bin)) {
    try {
      chmodSync(bin, 0o755)
    } catch {}
  }
}
