# Claude Code Dashboard

[中文](README.md)

A local web UI for managing multiple [Claude Code](https://claude.ai/code) projects. View session history, token usage, memories, skills, MCP servers, hooks, and more — all in one place.

![Dashboard Screenshot](docs/screenshot-dashboard.png)

## Features

- **Project Overview** — All your Claude Code projects with last activity, token usage, and model breakdown
- **Session History** — Browse and search conversation history with full message display, including sub-agent calls
- **Token Usage** — Charts by model and project, with minute/hour/day granularity and time range filters
- **Memory Management** — View and edit Claude Code memory files (CLAUDE.md, per-project memories)
- **Model Management** — Switch the global default model
- **Skill Management** — Browse installed skills from plugins and `~/.claude/skills/`
- **MCP Server Management** — Add, edit, and remove MCP servers (global and per-project)
- **Hooks Management** — Configure Claude Code lifecycle hooks (SessionStart, PreToolUse, etc.)
- **Tool Permissions** — Manage per-project allow/deny rules
- **Slash Commands** — Create and manage custom slash commands
- **Dark / Light mode** — Follows system or manual toggle

## Requirements

- **macOS** (uses `~/.claude/` directory structure)
- **Node.js 18+**
- **Claude Code** installed and used at least once (to have session data)

## Installation

```bash
git clone https://github.com/Evason-yang/Claude-code-dashboard.git
cd Claude-code-dashboard
npm install
npm start
```

The app builds the frontend and opens `http://localhost:3000` automatically.

## Development

```bash
npm run dev        # Start both backend (port 3000) and frontend (Vite, port 5173) with hot reload
npm test           # Run backend unit tests
npm run build      # Build frontend only
```

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
