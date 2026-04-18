# Claude Code Dashboard

[中文](README.md)

A local web UI for managing multiple [Claude Code](https://claude.ai/code) projects. View session history, token usage, memories, skills, MCP servers, hooks, and more — all in one place.

## Features

- **Project Overview** — All your Claude Code projects with last activity, token usage, and model breakdown
- **Session History** — Browse and search conversation history; collapsed view shows start/end times; full message display including sub-agent calls
- **Global Search** — Search across all sessions and projects
- **Token Usage** — Charts by model and project, with minute/hour/day granularity and time range filters
- **Memory Management** — View and edit Claude Code memory files (global memories auto-sync to `~/.claude/CLAUDE.md`)
- **Model Management** — Switch the global default model
- **Skill Management** — Browse installed skills from plugins and `~/.claude/skills/`
- **Plugin Management** — View plugins installed via `/plugins`, with uninstall support
- **MCP Server Management** — Add, edit, and remove MCP servers (global and per-project)
- **Hooks Management** — Configure Claude Code lifecycle hooks (SessionStart, PreToolUse, etc.)
- **Tool Permissions** — Manage per-project allow/deny rules
- **Slash Commands** — Create and manage custom slash commands
- **Update Notifications** — Sidebar shows a prompt when a new version is available
- **Dark / Light mode** — Follows system or manual toggle

## Requirements

- **macOS / Windows / Linux**
- **Node.js 18+**
- **Claude Code** installed and used at least once (to have session data)

## Installation

**macOS / Linux (recommended):**

```bash
curl -fsSL https://raw.githubusercontent.com/Evason-yang/Claude-code-dashboard/main/install.sh | bash
```

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/Evason-yang/Claude-code-dashboard/main/install.ps1 | iex
```

The script checks dependencies, clones the repo, installs packages, builds the frontend, and asks if you want to start immediately. Run the same command again to update to the latest version.

**Manual install:**

```bash
git clone https://github.com/Evason-yang/Claude-code-dashboard.git
cd Claude-code-dashboard
npm install
npm start
```

## Development

```bash
npm run dev        # Start both backend (port 3000) and frontend (Vite, port 5173) with hot reload
                   # Use http://localhost:5173 during development
npm test           # Run backend unit tests
npm run build      # Build frontend only (updates the page on port 3000)
```

> **Note**: `npm run dev` starts two servers. Use **port 5173** during development (hot reload). Port 3000 only updates after running `npm run build`.

## First Launch

On first launch, a setup dialog appears asking you to add a directory to scan for projects. Enter a path like `~/Projects` — the app will discover any directory that has been used with Claude Code.

You can also manually add individual project paths at any time from the sidebar.

## Data Sources

All data is read from local files — nothing is sent to any server:

| Data | Location |
|------|----------|
| Session history | `~/.claude/projects/<encoded-path>/*.jsonl` |
| Token usage | Parsed from session files |
| Memories | `~/.claude/projects/<encoded-path>/memory/` |
| Global settings | `~/.claude/settings.json` |
| Project settings | `.claude/settings.local.json` in each project |
| MCP servers | `~/conf.json` (global) and `~/.claude.json` (per-project) |
| Skills | `~/.claude/plugins/` and `~/.claude/skills/` |

## Tech Stack

- **Backend**: Node.js + Express (ESM)
- **Frontend**: React 18 + Vite + React Router 6
- **No database** — reads directly from Claude Code's local files
- **No external dependencies** beyond npm packages

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
