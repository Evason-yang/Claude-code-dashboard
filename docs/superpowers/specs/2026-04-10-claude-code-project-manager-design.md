# Claude Code 项目管理器 设计文档

**日期：** 2026-04-10  
**状态：** 已批准

---

## 概述

一个本地 Web UI 工具，供个人开发者管理多个 Claude Code 项目。支持项目概览、会话历史查看、Git 记录、模型配置、用量统计和技能管理。`npm start` 一条命令启动，浏览器打开即用。

---

## 架构

**单体应用**：Express 后端 + React 前端，前端 build 后由 Express 静态托管。无数据库，所有数据实时读文件系统。

```
mtClaudeCode/
├── server/
│   ├── index.js          # 入口：静态文件服务 + API 路由挂载
│   ├── projects.js       # 项目扫描、config 读写
│   ├── sessions.js       # 读取 .claude/conversations/ JSONL
│   ├── git.js            # git log 执行与解析
│   ├── usage.js          # token 用量统计与费用估算
│   └── skills.js         # ~/.claude/plugins/ 扫描与管理
├── client/
│   ├── main.jsx
│   ├── App.jsx           # 路由配置
│   └── components/
│       ├── Sidebar.jsx         # 左侧项目列表
│       ├── ProjectDetail.jsx   # 右侧详情容器（Tab 布局）
│       ├── OverviewTab.jsx     # 概览 Tab
│       ├── SessionList.jsx     # 会话历史 Tab
│       ├── GitLog.jsx          # Git 记录 Tab
│       ├── ProjectSettings.jsx # 项目设置 Tab（模型配置）
│       ├── UsagePage.jsx       # 用量统计独立页面
│       ├── SkillsPage.jsx      # 技能管理独立页面
│       └── OnboardingModal.jsx # 首次使用引导弹窗
├── package.json
└── vite.config.js
```

---

## 核心功能

### 项目管理
- 自动扫描指定目录（用户配置）发现包含 `.claude/` 的项目，同时支持手动添加任意路径
- 左侧边栏显示项目列表，按最近活动时间降序排列，显示活跃状态标记
- 配置持久化到 `~/.mtclaudecode/config.json`，包含扫描目录列表和手动添加的项目路径

### 项目详情（Tab 布局）

**概览 Tab**
- 显示项目路径、最后活动时间、会话总数
- 快捷操作：在终端打开（`open -a Terminal <path>`）、复制路径到剪贴板
- 当前配置的默认模型（可在设置 Tab 修改）

**会话历史 Tab**
- 读取 `<项目路径>/.claude/conversations/` 下的 JSONL 文件
- 列表展示：会话标题（取第一条用户消息前 50 字）、创建时间、消息数量
- 点击展开查看完整对话内容（气泡式展示，区分 user/assistant）

**Git 记录 Tab**
- 在项目目录执行 `git log --oneline -50`
- 显示：commit hash（前 7 位）、提交信息、作者、相对时间

**项目设置 Tab**
- 选择该项目的默认模型：`claude-opus-4-6` / `claude-sonnet-4-6` / `claude-haiku-4-5`
- 控制哪些已安装技能在该项目中启用（覆盖全局设置）

### 用量统计（独立页面，路由 `/usage`）
- 从所有项目的会话 JSONL 中解析 `usage` 字段（input_tokens / output_tokens）
- 展示维度：
  - 按项目汇总：各项目 token 消耗排行
  - 按时间：最近 7 天 / 30 天趋势图
- 费用估算：基于 Anthropic 官方定价（input/output 分别计算）
- 数据仅来自本地文件，不调用任何外部 API

### 技能管理（独立页面，路由 `/skills`）
- 扫描 `~/.claude/plugins/` 展示已安装技能列表（名称、描述、版本）
- 全局启用/禁用技能（写入 `~/.claude/settings.json`）
- 从本地路径安装新技能（复制到 `~/.claude/plugins/`）
- 从 URL 安装新技能（下载并解压到 `~/.claude/plugins/`）

---

## 数据流

### API 端点

```
GET  /api/projects                  # 所有项目列表
GET  /api/projects/:id              # 单个项目详情
POST /api/projects                  # 手动添加项目（body: { path }）
DELETE /api/projects/:id            # 移除项目

GET  /api/projects/:id/sessions     # 会话历史列表
GET  /api/projects/:id/sessions/:sid # 单条会话完整内容
GET  /api/projects/:id/git          # git log

GET  /api/usage                     # 全局用量统计
GET  /api/usage/:projectId          # 单项目用量

GET  /api/skills                    # 已安装技能列表
POST /api/skills/install            # 安装技能（body: { source: 'path'|'url', value }）
PUT  /api/skills/:id/toggle         # 启用/禁用（body: { enabled: boolean }）
```

### 数据来源
| 数据 | 来源 |
|------|------|
| 项目列表 | `~/.mtclaudecode/config.json` |
| 会话历史 | `<项目路径>/.claude/conversations/*.jsonl` |
| 用量数据 | 会话 JSONL 中的 `usage` 字段 |
| Git 记录 | `git log` 命令（在项目目录执行） |
| 技能列表 | `~/.claude/plugins/` 目录扫描 |
| 技能配置 | `~/.claude/settings.json` |

### 前端路由
```
/                    # 重定向到第一个项目（无项目则显示引导）
/projects/:id        # 项目详情（默认 Tab：概览）
/projects/:id/:tab   # 指定 Tab（overview/sessions/git/settings）
/usage               # 用量统计
/skills              # 技能管理
```

---

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 项目路径不存在 | 侧边栏显示警告图标，详情页提示"路径已失效，请更新或移除" |
| 非 git 仓库 | Git Tab 显示"此项目未初始化 git 仓库" |
| `.claude/` 目录不存在 | 会话历史 Tab 显示"暂无会话记录" |
| 技能安装失败 | 页面内 toast 提示具体错误原因 |
| 端口 3000 被占用 | 启动时自动尝试 3001、3002，控制台打印实际端口 |

---

## 启动方式

```bash
npm start        # 生产模式：构建前端 + 启动服务，自动打开浏览器
npm run dev      # 开发模式：前后端热更新（Vite + nodemon）
npm run build    # 仅构建前端产物到 server/public/
```

**首次使用流程：**
1. 启动时检测 `~/.mtclaudecode/config.json` 是否存在
2. 不存在则显示引导弹窗，用户输入要扫描的目录（默认 `~/`）
3. 后端扫描目录，发现包含 `.claude/` 的项目并展示预览
4. 用户确认后保存配置，进入主界面

---

## 配色

自动跟随 macOS 系统深色/浅色模式（CSS `prefers-color-scheme`）。
- 深色：GitHub Dark 风格（`#0d1117` 背景，`#58a6ff` 强调色）
- 浅色：GitHub Light 风格（`#ffffff` 背景，`#0969da` 强调色）
