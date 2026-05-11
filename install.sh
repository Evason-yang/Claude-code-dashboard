#!/usr/bin/env bash
set -e

# Claude Code Dashboard — 一键安装脚本
# 使用方式：curl -fsSL https://raw.githubusercontent.com/Evason-yang/Claude-code-dashboard/main/install.sh | bash

REPO="https://github.com/Evason-yang/Claude-code-dashboard.git"
INSTALL_DIR="$HOME/claude-code-dashboard"
PORT=3000

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     Claude Code Dashboard 安装程序       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 检查依赖 ──────────────────────────────────────────────────────────────────

check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "❌  未找到 $1，请先安装后重试"
    echo "    $2"
    exit 1
  fi
}

echo "▸ 检查依赖..."
check_command "node" "https://nodejs.org/"
check_command "npm"  "随 Node.js 一起安装"
check_command "git"  "https://git-scm.com/"

NODE_VER=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌  需要 Node.js 18 或更高版本，当前版本：$(node -v)"
  exit 1
fi
echo "   Node.js $(node -v) ✓"

# ── 检查 Claude Code 数据目录 ────────────────────────────────────────────────

if [ ! -d "$HOME/.claude" ]; then
  echo ""
  echo "⚠️   未找到 ~/.claude 目录"
  echo "    请先安装并运行 Claude Code（https://claude.ai/code）后再执行此脚本"
  exit 1
fi

# ── 安装或更新 ───────────────────────────────────────────────────────────────

if [ -d "$INSTALL_DIR/.git" ]; then
  echo ""
  echo "▸ 检测到已安装，正在更新..."
  cd "$INSTALL_DIR"
  git pull --ff-only
else
  echo ""
  echo "▸ 克隆仓库到 $INSTALL_DIR ..."
  git clone "$REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

echo ""
echo "▸ 安装依赖..."
npm install --silent

echo ""
echo "▸ 构建前端..."
npm run build --silent

echo ""
echo "▸ 创建桌面图标..."
node scripts/setup-desktop.js || echo "⚠️  桌面图标创建失败，可手动运行：node scripts/setup-desktop.js"

# ── 创建启动脚本 ─────────────────────────────────────────────────────────────

LAUNCHER="$HOME/.local/bin/claude-dashboard"
mkdir -p "$HOME/.local/bin"

cat > "$LAUNCHER" << SCRIPT
#!/usr/bin/env bash
cd "$INSTALL_DIR"
exec node server/index.js "\$@"
SCRIPT
chmod +x "$LAUNCHER"

# ── 完成 ─────────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           ✅  安装完成！                  ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "启动方式："
echo ""
echo "  方式一（推荐）：双击桌面的 Claude Dashboard 图标"
echo ""
echo "  方式二（命令行）："
echo "    cd $INSTALL_DIR && npm start"
echo ""
echo "  方式三（命令行，需将 ~/.local/bin 加入 PATH）："
echo "    claude-dashboard"
echo ""
echo "  启动后访问：http://localhost:$PORT"
echo ""
echo "卸载："
echo "  $INSTALL_DIR/uninstall.sh"
echo ""

# 询问是否立即启动
read -r -p "是否立即启动？[Y/n] " REPLY
REPLY="${REPLY:-Y}"
if [[ "$REPLY" =~ ^[Yy]$ ]]; then
  echo ""
  echo "▸ 正在启动..."
  cd "$INSTALL_DIR"
  npm start
fi
