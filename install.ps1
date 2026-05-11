# Claude Code Dashboard — Windows 安装脚本 (PowerShell)
# 使用方式：
#   irm https://raw.githubusercontent.com/Evason-yang/Claude-code-dashboard/main/install.ps1 | iex

$ErrorActionPreference = "Stop"
$REPO = "https://github.com/Evason-yang/Claude-code-dashboard.git"
$INSTALL_DIR = "$env:USERPROFILE\claude-code-dashboard"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗"
Write-Host "║     Claude Code Dashboard 安装程序       ║"
Write-Host "╚══════════════════════════════════════════╝"
Write-Host ""

# 检查依赖
Write-Host "▸ 检查依赖..."

if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "❌  未找到 node，请先安装 Node.js: https://nodejs.org/"
    exit 1
}
if (-not (Get-Command "git" -ErrorAction SilentlyContinue)) {
    Write-Host "❌  未找到 git，请先安装 Git: https://git-scm.com/"
    exit 1
}

$nodeVer = (node -e "process.stdout.write(process.version.slice(1).split('.')[0])") -as [int]
if ($nodeVer -lt 18) {
    Write-Host "❌  需要 Node.js 18 或更高版本，当前版本：$(node -v)"
    exit 1
}
Write-Host "   Node.js $(node -v) ✓"

# 检查 Claude Code 数据目录
$claudeDir = "$env:USERPROFILE\.claude"
if (-not (Test-Path $claudeDir)) {
    Write-Host ""
    Write-Host "⚠️   未找到 $claudeDir 目录"
    Write-Host "    请先安装并运行 Claude Code（https://claude.ai/code）后再执行此脚本"
    exit 1
}

# 安装或更新
Write-Host ""
if (Test-Path "$INSTALL_DIR\.git") {
    Write-Host "▸ 检测到已安装，正在更新..."
    Set-Location $INSTALL_DIR
    git pull --ff-only
} else {
    Write-Host "▸ 克隆仓库到 $INSTALL_DIR ..."
    git clone $REPO $INSTALL_DIR
    Set-Location $INSTALL_DIR
}

Write-Host ""
Write-Host "▸ 安装依赖..."
npm install --silent

Write-Host ""
Write-Host "▸ 构建前端..."
npm run build --silent

Write-Host ""
Write-Host "▸ 创建桌面图标..."
try {
    node scripts\setup-desktop.js
} catch {
    Write-Host "⚠️  桌面图标创建失败，可手动运行：node scripts\setup-desktop.js"
}

# 创建启动脚本
$launcherDir = "$env:USERPROFILE\.local\bin"
New-Item -ItemType Directory -Force -Path $launcherDir | Out-Null
$launcherPath = "$launcherDir\claude-dashboard.cmd"
@"
@echo off
cd /d "$INSTALL_DIR"
node server\index.js %*
"@ | Set-Content $launcherPath

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗"
Write-Host "║           ✅  安装完成！                  ║"
Write-Host "╚══════════════════════════════════════════╝"
Write-Host ""
Write-Host "启动方式："
Write-Host ""
Write-Host "  方式一（推荐）：双击桌面的 Claude Dashboard 快捷方式"
Write-Host ""
Write-Host "  方式二（命令行）："
Write-Host "    cd $INSTALL_DIR"
Write-Host "    npm start"
Write-Host ""
Write-Host "  方式三（命令行）："
Write-Host "    claude-dashboard  （需将 $launcherDir 加入 PATH）"
Write-Host ""
Write-Host "  启动后访问：http://localhost:3000"
Write-Host ""
Write-Host "卸载："
Write-Host "  $INSTALL_DIR\uninstall.ps1"
Write-Host ""

$reply = Read-Host "是否立即启动？[Y/n]"
if ($reply -eq "" -or $reply -match "^[Yy]") {
    Write-Host ""
    Write-Host "▸ 正在启动..."
    Set-Location $INSTALL_DIR
    npm start
}
