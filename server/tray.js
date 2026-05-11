// server/tray.js
import SysTray from 'systray2'
import { checkUpdate, runUpdate } from './updater.js'
import { isEnabled, enable, disable } from './autostart.js'
import open from 'open'

const PORT = process.env.PORT || 3000

// 只在桌面环境下启动托盘
export function shouldInitTray() {
  if (process.env.CI) return false
  if (process.env.NODE_ENV === 'test') return false
  // 无 DISPLAY 的 Linux（Docker 等）跳过
  if (process.platform === 'linux' && !process.env.DISPLAY) return false
  return true
}

export async function initTray() {
  if (!shouldInitTray()) return

  let autostartOn = false
  try { autostartOn = isEnabled() } catch {}

  function getAutostartTitle() {
    return autostartOn ? '✓ 开机自启动' : '  开机自启动'
  }

  // 持有对象引用，以便库注入 __id 后可以通过 sendAction 更新
  const autostartItem = {
    title: getAutostartTitle(),
    tooltip: '设置是否开机自动启动',
    checked: false,
    enabled: true,
    click: () => {
      try {
        const current = isEnabled()
        if (current) disable()
        else enable()
        autostartOn = isEnabled()
        autostartItem.title = getAutostartTitle()
        systray.sendAction({
          type: 'update-item',
          item: autostartItem
        })
        console.log(`[tray] 开机自启动已${autostartOn ? '启用' : '禁用'}`)
      } catch (e) {
        console.warn('[tray] 自启动设置失败:', e.message)
      }
    }
  }

  let systray
  try {
    systray = new SysTray({
      menu: {
        icon: null,
        title: 'Claude Dashboard',
        tooltip: 'Claude Code Dashboard',
        items: [
          {
            title: '打开界面',
            tooltip: '在浏览器中打开 Dashboard',
            checked: false,
            enabled: true,
            click: () => {
              open(`http://localhost:${PORT}`).catch(() => {})
            }
          },
          {
            title: '检查更新',
            tooltip: '检查是否有新版本',
            checked: false,
            enabled: true,
            click: () => {
              console.log('[tray] 正在检查更新...')
              checkUpdate().then(({ local, latest, hasUpdate }) => {
                if (!hasUpdate) {
                  console.log(`[tray] 已是最新版本 v${local}`)
                  return
                }
                console.log(`[tray] 发现新版本 v${latest}（当前 v${local}）`)
                console.log('[tray] 正在更新，请稍候...')
                const result = runUpdate()
                if (result.ok) {
                  console.log('[tray] 更新完成，请重启服务以生效')
                } else {
                  console.error('[tray] 更新失败:', result.error)
                }
              }).catch(e => console.warn('[tray] 检查更新失败:', e.message))
            }
          },
          SysTray.separator,
          autostartItem,
          SysTray.separator,
          {
            title: '退出',
            tooltip: '关闭 Dashboard 服务',
            checked: false,
            enabled: true,
            click: () => {
              systray.kill(false)
              process.exit(0)
            }
          }
        ]
      }
    })

    await systray.ready()
  } catch (e) {
    console.warn('[tray] 无法初始化系统托盘:', e.message)
    return
  }

  // 注册点击处理器，调用每个菜单项的 click 回调
  systray.onClick(action => {
    if (action.item && typeof action.item.click === 'function') {
      action.item.click()
    }
  })

  console.log('[tray] 系统托盘已初始化')
}
