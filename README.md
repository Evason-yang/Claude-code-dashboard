# Claude Code Dashboard

[English](README.en.md)

一个用于管理多个 [Claude Code](https://claude.ai/code) 项目的本地 Web 界面。在一个地方查看会话历史、Token 用量、记忆文件、Skill 插件、MCP 服务器、Hooks 配置等所有内容。

## 功能特性

- **项目总览** — 所有 Claude Code 项目的最近活动、Token 用量和模型分布图表
- **会话历史** — 浏览并搜索完整对话记录，折叠状态显示开始/结束时间，支持展示子 Agent 调用详情
- **全局搜索** — 跨项目搜索所有会话内容
- **Token 用量统计** — 按模型和项目分类的图表，支持分钟/小时/天粒度和时间范围筛选
- **记忆管理** — 查看和编辑 Claude Code 记忆文件（全局记忆自动同步到 `~/.claude/CLAUDE.md`）
- **模型管理** — 切换全局默认模型
- **Skill 管理** — 浏览来自插件和 `~/.claude/skills/` 的已安装 Skill
- **插件管理** — 查看通过 `/plugins` 安装的插件，支持卸载
- **MCP 服务器管理** — 添加、编辑和删除 MCP 服务器（全局和项目级）
- **Hooks 管理** — 配置 Claude Code 生命周期钩子（SessionStart、PreToolUse 等）
- **工具权限** — 管理每个项目的 allow/deny 规则
- **Slash Commands** — 创建和管理自定义斜杠命令
- **版本更新提示** — 有新版本时侧边栏自动提示
- **深色 / 浅色模式** — 跟随系统或手动切换

## 环境要求

- **macOS / Windows / Linux**
- **Node.js 18+**
- **Claude Code** 已安装并至少使用过一次（需要有会话数据）

## 安装

**macOS / Linux 一键安装（推荐）：**

```bash
curl -fsSL https://raw.githubusercontent.com/Evason-yang/Claude-code-dashboard/main/install.sh | bash
```

**Windows 一键安装（PowerShell）：**

```powershell
irm https://raw.githubusercontent.com/Evason-yang/Claude-code-dashboard/main/install.ps1 | iex
```

脚本会自动检查依赖、克隆仓库、安装依赖、构建前端，并询问是否立即启动。再次运行同一命令可更新到最新版本。

**手动安装：**

```bash
git clone https://github.com/Evason-yang/Claude-code-dashboard.git
cd Claude-code-dashboard
npm install
npm start
```

## 开发模式

```bash
npm run dev     # 同时启动后端（端口 3000）和前端（Vite，端口 5173），支持热更新
                # 开发时请访问 http://localhost:5173
npm test        # 运行后端单元测试
npm run build   # 仅构建前端（更新 3000 端口的页面）
```

> **注意**：`npm run dev` 会启动两个服务。开发时访问 **5173 端口**（热更新）；运行 `npm run build` 后 3000 端口才会更新为最新页面。

## 首次启动

首次启动时会弹出引导对话框，填入要扫描的目录（如 `~/Projects`），应用会自动发现其中所有使用过 Claude Code 的项目。

也可以随时通过侧边栏底部的「+ 添加项目」手动添加单个项目路径。

## 数据来源

所有数据均从本地文件读取，不会向任何服务器发送：

| 数据 | 位置 |
|------|------|
| 会话历史 | `~/.claude/projects/<编码路径>/*.jsonl` |
| Token 用量 | 从会话文件解析 |
| 记忆文件 | `~/.claude/projects/<编码路径>/memory/` |
| 全局设置 | `~/.claude/settings.json` |
| 项目设置 | 各项目的 `.claude/settings.local.json` |
| MCP 服务器 | `~/conf.json`（全局）和 `~/.claude.json`（项目级）|
| Skill 插件 | `~/.claude/plugins/` 和 `~/.claude/skills/` |

## 技术栈

- **后端**：Node.js + Express（ESM）
- **前端**：React 18 + Vite + React Router 6
- **无数据库** — 直接读取 Claude Code 的本地文件
- **零外部服务依赖**

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开源协议

MIT — 见 [LICENSE](LICENSE)。
