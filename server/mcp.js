import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import os from 'os'

const GLOBAL_MCP_PATH = join(os.homedir(), 'conf.json')
const CLAUDE_JSON_PATH = join(os.homedir(), '.claude.json')

function loadGlobalConf() {
  if (!existsSync(GLOBAL_MCP_PATH)) return {}
  try { return JSON.parse(readFileSync(GLOBAL_MCP_PATH, 'utf8')) } catch { return {} }
}

function saveGlobalConf(conf) {
  writeFileSync(GLOBAL_MCP_PATH, JSON.stringify(conf, null, 2))
}

function loadClaudeJson() {
  if (!existsSync(CLAUDE_JSON_PATH)) return {}
  try { return JSON.parse(readFileSync(CLAUDE_JSON_PATH, 'utf8')) } catch { return {} }
}

function saveClaudeJson(data) {
  writeFileSync(CLAUDE_JSON_PATH, JSON.stringify(data, null, 2))
}

// 列出全局 MCP servers
export function listGlobalMcpServers() {
  const conf = loadGlobalConf()
  const servers = conf.mcpServers || {}
  return Object.entries(servers).map(([name, cfg]) => ({ name, scope: 'global', ...cfg }))
}

// 列出某项目的 MCP servers
export function listProjectMcpServers(projectPath) {
  const data = loadClaudeJson()
  const proj = data.projects?.[projectPath] || {}
  const servers = proj.mcpServers || {}
  return Object.entries(servers).map(([name, cfg]) => ({ name, scope: 'project', ...cfg }))
}

// 保存全局 MCP server（新建或更新）
export function saveGlobalMcpServer(name, config) {
  const conf = loadGlobalConf()
  if (!conf.mcpServers) conf.mcpServers = {}
  conf.mcpServers[name] = config
  saveGlobalConf(conf)
}

// 保存项目级 MCP server
export function saveProjectMcpServer(projectPath, name, config) {
  const data = loadClaudeJson()
  if (!data.projects) data.projects = {}
  if (!data.projects[projectPath]) data.projects[projectPath] = {}
  if (!data.projects[projectPath].mcpServers) data.projects[projectPath].mcpServers = {}
  data.projects[projectPath].mcpServers[name] = config
  saveClaudeJson(data)
}

// 删除全局 MCP server
export function deleteGlobalMcpServer(name) {
  const conf = loadGlobalConf()
  if (conf.mcpServers) delete conf.mcpServers[name]
  saveGlobalConf(conf)
}

// 删除项目级 MCP server
export function deleteProjectMcpServer(projectPath, name) {
  const data = loadClaudeJson()
  if (data.projects?.[projectPath]?.mcpServers) {
    delete data.projects[projectPath].mcpServers[name]
    saveClaudeJson(data)
  }
}
