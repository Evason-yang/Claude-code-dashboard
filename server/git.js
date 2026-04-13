import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

export function getGitLog(projectPath, limit = 50) {
  if (!existsSync(join(projectPath, '.git'))) return []
  try {
    const out = execSync(
      `git log --pretty=format:"%h|||%s|||%an|||%ar" -${limit}`,
      { cwd: projectPath, encoding: 'utf8', timeout: 5000 }
    )
    return out.trim().split('\n').filter(Boolean).map(line => {
      const [hash, message, author, relativeTime] = line.split('|||')
      return { hash, message, author, relativeTime }
    })
  } catch {
    return []
  }
}
