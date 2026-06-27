const CONFIG_KEY = 'portfolio_github_config'
const SHA_KEY = 'portfolio_content_sha'

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
  // Cache SHA so saveContentToGithub doesn't need a separate GET
  localStorage.setItem(SHA_KEY, data.sha)
  // GitHub returns base64 with line breaks — strip them before decoding
  const cleaned = data.content.replace(/\n/g, '')
  // atob returns binary string; decodeURIComponent(escape(...)) converts to proper UTF-8
  const jsonStr = decodeURIComponent(escape(atob(cleaned)))
  const content = JSON.parse(jsonStr)
  return { content, sha: data.sha }
}

export async function getTokenExpiration() {
  const config = getGithubConfig()
  if (!config?.token) return { error: 'no-config' }

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: apiHeaders(config.token),
    })
    if (!res.ok) return { error: 'invalid' }

    const header = res.headers.get('GitHub-Authentication-Token-Expiration')
    if (!header) return { expires: null, days: null }

    // Header format: "2025-01-01 00:00:00 UTC"
    const date = new Date(header.replace(' UTC', 'Z').replace(' ', 'T'))
    const days = Math.ceil((date - Date.now()) / 86400000)
    saveGithubConfig({ ...config, tokenExpires: header })
    return { expires: date, days }
  } catch {
    return { error: 'network' }
  }
}

export async function saveContentToGithub(content) {
  const config = getGithubConfig()
  if (!config?.token || !config?.owner || !config?.repo) {
    throw new Error('GitHub not configured — open Settings and connect GitHub')
  }

  const { token, owner, repo } = config
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/content.json`

  console.log('[GitHub save] Saving to', `${owner}/${repo}`)
  console.log('[GitHub save] Token:', token.slice(0, 8) + '...')

  // Step 1: Get file SHA — try cache first to avoid downloading the full file
  let sha = localStorage.getItem(SHA_KEY) || null
  console.log('[GitHub save] Cached SHA:', sha ? sha.slice(0, 8) + '...' : 'none')

  // Always verify with a live GET to avoid stale-SHA 409 conflicts
  console.log('[GitHub save] Verifying SHA with GitHub...')
  let shaRes
  try {
    shaRes = await fetch(url, { headers: apiHeaders(token) })
  } catch (networkErr) {
    throw new Error('Network error — check your internet connection')
  }

  console.log('[GitHub save] SHA GET status:', shaRes.status)

  if (shaRes.ok) {
    const shaData = await shaRes.json()
    sha = shaData.sha
    localStorage.setItem(SHA_KEY, sha)
    console.log('[GitHub save] Live SHA:', sha.slice(0, 8) + '...')
  } else if (shaRes.status === 404) {
    sha = null
    console.log('[GitHub save] File does not exist — will create fresh')
  } else if (shaRes.status === 401) {
    throw new Error('Token rejected (401) — your GitHub token may have expired')
  } else if (shaRes.status === 403) {
    throw new Error('Permission denied (403) — token needs "repo" scope')
  } else {
    const errBody = await shaRes.json().catch(() => ({}))
    throw new Error(`GitHub error ${shaRes.status}: ${errBody.message || 'unknown'}`)
  }

  // Step 2: Encode content
  const jsonStr = JSON.stringify(content, null, 2)
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)))
  console.log('[GitHub save] Payload size:', jsonStr.length, 'chars /', base64.length, 'base64 chars')

  // Step 3: Commit via PUT
  const body = {
    message: 'Update portfolio content',
    content: base64,
    ...(sha ? { sha } : {}),
  }

  console.log('[GitHub save] Sending PUT...')
  let res
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: apiHeaders(token),
      body: JSON.stringify(body),
    })
  } catch (networkErr) {
    throw new Error('Network error during save — check your internet connection')
  }

  console.log('[GitHub save] PUT status:', res.status)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[GitHub save] PUT failed:', err)
    if (res.status === 401) throw new Error('Token rejected (401) — token may have expired')
    if (res.status === 403) throw new Error('Permission denied (403) — token needs "repo" scope')
    if (res.status === 409) throw new Error('SHA conflict (409) — try saving again')
    if (res.status === 422) throw new Error(`Validation failed (422): ${err.message || 'check token & repo name'}`)
    throw new Error(err.message || `Save failed (${res.status})`)
  }

  const result = await res.json()
  // Cache the new SHA for the next save
  if (result.content?.sha) {
    localStorage.setItem(SHA_KEY, result.content.sha)
    console.log('[GitHub save] New SHA cached:', result.content.sha.slice(0, 8) + '...')
  }
  console.log('[GitHub save] Save successful!')
  return result
}
