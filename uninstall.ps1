# Claude Code Dashboard — Windows 卸载脚本 (PowerShell)
# 使用方式：
#   irm https://raw.githubusercontent.com/Evason-yang/Claude-code-dashboard/main/uninstall.ps1 | iex

$INSTALL_DIR = "$env:USERPROFILE\claude-code-dashboard"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗"
Write-Host "║     Claude Code Dashboard 卸载程序       ║"
Write-Host "╚══════════════════════════════════════════╝"
Write-Host ""

# ── 停止正在运行的服务 ────────────────────────────────────────────────────────

Write-Host "▸ 停止服务..."
$proc = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*claude-code-dashboard*"
}
if ($proc) {
    $proc | Stop-Process -Force
    Write-Host "   已停止服务进程"
} else {
    Write-Host "   服务未在运行"
}

# ── 开机自启动（注册表） ──────────────────────────────────────────────────────

Write-Host ""
Write-Host "▸ 移除开机自启动..."
$regKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$regName = "ClaudeDashboard"
if (Get-ItemProperty -Path $regKey -Name $regName -ErrorAction SilentlyContinue) {
    Remove-ItemProperty -Path $regKey -Name $regName -Force
    Write-Host "   已移除注册表自启动项"
} else {
    Write-Host "   未设置开机自启动"
}

# ── 桌面图标 ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "▸ 移除桌面图标..."
$desktopLnk = "$env:USERPROFILE\Desktop\Claude Dashboard.lnk"
$launchBat = "$INSTALL_DIR\launch.bat"
if (Test-Path $desktopLnk) {
    Remove-Item $desktopLnk -Force
    Write-Host "   已移除 $desktopLnk"
} else {
    Write-Host "   桌面图标不存在"
}
if (Test-Path $launchBat) {
    Remove-Item $launchBat -Force
}

# ── 启动命令 ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "▸ 移除命令行启动器..."
$launcherPath = "$env:USERPROFILE\.local\bin\claude-dashboard.cmd"
if (Test-Path $launcherPath) {
    Remove-Item $launcherPath -Force
    Write-Host "   已移除 $launcherPath"
} else {
    Write-Host "   启动器不存在"
}

# ── 仓库目录 ──────────────────────────────────────────────────────────────────

Write-Host ""
if (Test-Path $INSTALL_DIR) {
    $reply = Read-Host "是否删除安装目录 $INSTALL_DIR？[y/N]"
    if ($reply -match "^[Yy]") {
        Remove-Item $INSTALL_DIR -Recurse -Force
        Write-Host "   已删除 $INSTALL_DIR"
    } else {
        Write-Host "   已保留 $INSTALL_DIR"
    }
}

# ── 完成 ─────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗"
Write-Host "║           ✅  卸载完成！                  ║"
Write-Host "╚══════════════════════════════════════════╝"
Write-Host ""
