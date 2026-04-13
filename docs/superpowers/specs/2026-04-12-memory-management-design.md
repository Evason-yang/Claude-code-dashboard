# 记忆管理模块 设计文档

**日期：** 2026-04-12
**状态：** 已批准

---

## 概述

在 Claude Code 项目管理器中新增记忆管理模块，支持查看、新建、编辑、删除各项目的 Claude Code 记忆文件（`~/.claude/projects/<encoded>/memory/*.md`）。入口分两处：项目详情页 Tab 和全局导航页。

---

## 架构

**数据来源**
- 路径：`~/.claude/projects/<encoded-path>/memory/`
- 每个 `.md` 文件包含 YAML frontmatter（`name`、`description`、`type`）+ 正文
- `MEMORY.md` 为索引文件，每次写操作后自动重建

**新增后端文件**
- `server/memories.js`：记忆文件读写逻辑（解析/写入/删除/重建索引）

**新增前端文件**
- `client/components/MemoryTab.jsx`：项目详情页记忆 Tab
- `client/components/MemoriesPage.jsx`：全局记忆管理页（按项目分组）
- `client/components/MemoryEditor.jsx`：新建/编辑弹窗（两处共用）

---

## API 端点

```
GET    /api/projects/:id/memories           # 列出该项目所有记忆
GET    /api/projects/:id/memories/:file     # 读取单条记忆内容
POST   /api/projects/:id/memories           # 新建记忆
PUT    /api/projects/:id/memories/:file     # 更新记忆
DELETE /api/projects/:id/memories/:file     # 删除记忆

GET    /api/memories                        # 全局：所有项目记忆汇总
```

---

## 数据结构

单条记忆对象：
```json
{
  "file": "user_profile.md",
  "name": "User Profile",
  "description": "用户偏好和背景信息",
  "type": "user",
  "content": "- 始终用中文与用户交互\n..."
}
```

type 取值：`user` / `feedback` / `project` / `reference`

---

## 前端设计

### 项目详情页 Tab
- Tab 栏新增「记忆」，路由 `/projects/:id/memories`
- 列表展示该项目所有记忆，每条显示 type badge + name + description
- 点击展开正文，行内编辑/删除按钮
- 右上角「+ 新建」按钮

### 全局记忆管理页（路由 `/memories`）
- 左侧导航新增「记忆管理」入口
- 按项目分组，每组显示项目名 + 记忆数量
- 功能与项目 Tab 一致

### MemoryEditor 弹窗
字段：
- `name`：标题（必填）
- `type`：下拉（user / feedback / project / reference）
- `description`：一行摘要
- 正文：多行文本区

### type 颜色
| type | 颜色 |
|------|------|
| user | 蓝色 `#58a6ff` |
| feedback | 橙色 `#f0883e` |
| project | 绿色 `#3fb950` |
| reference | 紫色 `#d2a8ff` |

---

## 写入规则

- **新建**：文件名由 name slugify（小写、空格转 `_`、只保留字母数字下划线），冲突时加数字后缀
- **更新**：覆写文件内容，保持文件名不变
- **删除**：删除文件
- **重建 MEMORY.md**：每次写操作后遍历剩余 `.md` 文件，生成 `- [name](file) — description` 格式索引
- **目录不存在**：自动创建 `memory/` 目录

---

## 错误处理

| 场景 | 处理 |
|------|------|
| `memory/` 目录不存在 | 显示「暂无记忆」+ 新建按钮，点击新建时自动创建目录 |
| frontmatter 解析失败 | 仍展示文件，type 标为 `unknown`，name 用文件名 |
| 文件名冲突 | 自动追加 `_2`、`_3` 后缀 |
