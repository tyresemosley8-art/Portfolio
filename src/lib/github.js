const CONFIG_KEY = 'portfolio_github_config'

export function getGithubConfig() {
  try {
    const v = localStorage.getItem(CONFIG_KEY)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

export function saveGithubConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function clearGithubConfig() {
  localStorage.removeItem(CONFIG_KEY)
}

function apiHeaders(token) {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }
}

export async function fetchContentFromGithub() {
  const config = getGithubConfig()
  if (!config?.token || !config?.owner || !config?.repo) return null

  const { token, owner, repo } = config
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/content.json`,
    { headers: apiHeaders(token) }
  )
  if (!res.ok) return null

  const data = await res.json()
  // GitHub returns base64 with line breaks — strip them before decoding
  const cleaned = data.content.replace(/\n/g, '')
  // atob returns binary string; decodeURIComponent(escape(...)) converts to proper UTF-8
  const jsonStr = decodeURIComponent(escape(atob(cleaned)))
  const content = JSON.parse(jsonStr)
  return { content, sha: data.sha }
}

export async function saveContentToGithub(content) {
  const config = getGithubConfig()
  if (!config?.token || !config?.owner || !config?.repo) {
    throw new Error('GitHub not configured')
  }

  const { token, owner, repo } = config

  // Get current SHA
  let sha = null
  try {
    const existing = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/content.json`,
      { headers: apiHeaders(token) }
    )
    if (existing.ok) {
      const data = await existing.json()
      sha = data.sha
    }
  } catch {
    // File doesn't exist yet — first commit
  }

  const jsonStr = JSON.stringify(content, null, 2)
  // btoa with unicode-safe encoding
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)))

  const body = {
    message: 'Update portfolio content',
    content: base64,
    ...(sha ? { sha } : {}),
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/content.json`,
    { method: 'PUT', headers: apiHeaders(token), body: JSON.stringify(body) }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'GitHub save failed')
  }

  return res.json()
}
