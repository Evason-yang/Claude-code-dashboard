# Contributing to Claude Code Dashboard

Thanks for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Claude-code-dashboard.git`
3. Install dependencies: `npm install`
4. Start in dev mode: `npm run dev`

## Project Structure

```
server/          # Express backend (Node.js ESM)
  index.js       # API routes
  sessions.js    # Read Claude Code session files
  projects.js    # Project discovery
  memories.js    # Memory file CRUD
  mcp.js         # MCP server config
  search.js      # Session full-text search
  hooks.js       # Hooks config (if present)
  ...

client/
  components/    # React components
  App.jsx        # Router
  main.jsx       # Entry point
  index.html

server/__tests__/  # Vitest unit tests
```

## Running Tests

```bash
npm test
```

## Making Changes

- Backend changes: edit files in `server/`, restart with `npm run dev:server`
- Frontend changes: edit files in `client/`, Vite hot-reloads automatically
- New API endpoints: add to `server/index.js`, follow existing patterns

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Add tests for new backend logic where practical
- Test on macOS with real Claude Code session data if possible
- Update README if you add a new feature

## Reporting Issues

Please include:
- macOS version
- Node.js version (`node --version`)
- Claude Code version (`claude --version`)
- Steps to reproduce
