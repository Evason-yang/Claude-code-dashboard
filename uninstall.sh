#!/usr/bin/env bash
set -e

INSTALL_DIR="$HOME/claude-code-dashboard"
PORT=3000

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     Claude Code Dashboard 卸载程序       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 停止正在运行的服务 ────────────────────────────────────────────────────────

echo "▸ 停止服务..."
pkill -f "node.*claude-code-dashboard" 2>/dev/null && echo "   已停止服务进程" || echo "   服务未在运行"

# ── 开机自启动 ────────────────────────────────────────────────────────────────

echo ""
echo "▸ 移除开机自启动..."
if [ "$(uname)" = "Darwin" ]; then
  PLIST="$HOME/Library/LaunchAgents/com.claudedashboard.plist"
  if [ -f "$PLIST" ]; then
    launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$PLIST"
    echo "   已移除 launchd plist"
  else
    echo "   未设置开机自启动"
  fi
else
  AUTOSTART="$HOME/.config/autostart/claude-dashboard.desktop"
  if [ -f "$AUTOSTART" ]; then
    rm -f "$AUTOSTART"
    echo "   已移除 XDG autostart 配置"
  else
    echo "   未设置开机自启动"
  fi
fi

# ── 桌面图标 ──────────────────────────────────────────────────────────────────

echo ""
echo "▸ 移除桌面图标..."
if [ "$(uname)" = "Darwin" ]; then
  APP="$HOME/Desktop/Claude Dashboard.app"
  if [ -d "$APP" ]; then
    rm -rf "$APP"
    echo "   已移除 $APP"
  else
    echo "   桌面图标不存在"
  fi
else
  DESKTOP_FILE="$HOME/Desktop/claude-dashboard.desktop"
  LAUNCHER_SH="$INSTALL_DIR/launch.sh"
  if [ -f "$DESKTOP_FILE" ]; then
    rm -f "$DESKTOP_FILE"
    echo "   已移除 $DESKTOP_FILE"
  else
    echo "   桌面图标不存在"
  fi
  [ -f "$LAUNCHER_SH" ] && rm -f "$LAUNCHER_SH"
fi

# ── 启动命令 ──────────────────────────────────────────────────────────────────

echo ""
echo "▸ 移除命令行启动器..."
LAUNCHER="$HOME/.local/bin/claude-dashboard"
if [ -f "$LAUNCHER" ]; then
  rm -f "$LAUNCHER"
  echo "   已移除 $LAUNCHER"
else
  echo "   启动器不存在"
fi

# ── 仓库目录 ──────────────────────────────────────────────────────────────────

echo ""
if [ -d "$INSTALL_DIR" ]; then
  read -r -p "是否删除安装目录 $INSTALL_DIR？[y/N] " REPLY
  REPLY="${REPLY:-N}"
  if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    rm -rf "$INSTALL_DIR"
    echo "   已删除 $INSTALL_DIR"
  else
    echo "   已保留 $INSTALL_DIR"
  fi
fi

# ── 完成 ─────────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           ✅  卸载完成！                  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
