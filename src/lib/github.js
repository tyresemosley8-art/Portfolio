// ── Hardcoded repo (never changes) ───────────────────────────
const REPO_OWNER = 'tyresemosley8-art'
const REPO_NAME  = 'Portfolio'
const BRANCH     = 'master'

const RAW_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/content.json`
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/content.json`

const TOKEN_KEY    = 'portfolio_github_token'
const TOKEN_META   = 'portfolio_token_meta'   // stores { expires: string }
const SHA_KEY      = 'portfolio_content_sha'

// ── Token storage ─────────────────────────────────────────────
export function getToken() {
  const t = localStorage.getItem(TOKEN_KEY)
  if (t) return t
  // Migrate from old portfolio_github_config key
  try {
    const old = localStorage.getItem('portfolio_github_config')
    if (old) {
      const parsed = JSON.parse(old)
      if (parsed?.token) {
        localStorage.setItem(TOKEN_KEY, parsed.token)
        return parsed.token
      }
    }
  } catch { /* ignore */ }
  return null
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_META)
  localStorage.removeItem(SHA_KEY)
}

// Kept for backwards compat with Admin/App code that calls getGithubConfig()
export function getGithubConfig() {
  const token = getToken()
  return token ? { token, owner: REPO_OWNER, repo: REPO_NAME } : null
}
export function saveGithubConfig({ token }) {
  if (token) saveToken(token)
}
export function clearGithubConfig() {
  clearToken()
}

function apiHeaders(token) {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }
}

// ── Read: public raw URL, no token needed ─────────────────────
export async function fetchContentFromGithub() {
  try {
    // cache:'no-cache' bypasses CDN so we always get the latest version
    const res = await fetch(RAW_URL, { cache: 'no-cache' })
    if (!res.ok) return null
    const content = await res.json()
    return { content }
  } catch {
    return null
  }
}

// ── Token expiry check ────────────────────────────────────────
export async function getTokenExpiration() {
  const token = getToken()
  if (!token) return { error: 'no-config' }

  try {
    const res = await fetch('https://api.github.com/user', { headers: apiHeaders(token) })
    if (!res.ok) return { error: 'invalid' }

    const header = res.headers.get('GitHub-Authentication-Token-Expiration')
    if (!header) return { expires: null, days: null }

    // "2025-01-01 00:00:00 UTC"
    const date = new Date(header.replace(' UTC', 'Z').replace(' ', 'T'))
    const days = Math.ceil((date - Date.now()) / 86400000)
    localStorage.setItem(TOKEN_META, JSON.stringify({ expires: header }))
    return { expires: date, days }
  } catch {
    return { error: 'network' }
  }
}

// ── Write: API with token ─────────────────────────────────────
export async function saveContentToGithub(content) {
  const token = getToken()
  if (!token) throw new Error('No GitHub token — open Settings and enter your token')

  console.log('[GitHub save] Saving to', `${REPO_OWNER}/${REPO_NAME}`)
  console.log('[GitHub save] Token:', token.slice(0, 8) + '...')

  // Step 1: get current SHA (required for updating an existing file)
  console.log('[GitHub save] Fetching current SHA...')
  let shaRes
  try {
    shaRes = await fetch(API_URL, { headers: apiHeaders(token) })
  } catch {
    throw new Error('Network error — check your internet connection')
  }
  console.log('[GitHub save] SHA GET status:', shaRes.status)

  let sha = null
  if (shaRes.ok) {
    const shaData = await shaRes.json()
    sha = shaData.sha
    localStorage.setItem(SHA_KEY, sha)
    console.log('[GitHub save] SHA:', sha.slice(0, 8) + '...')
  } else if (shaRes.status === 404) {
    console.log('[GitHub save] File does not exist — creating fresh')
  } else if (shaRes.status === 401) {
    throw new Error('Token rejected (401) — your token may have expired')
  } else if (shaRes.status === 403) {
    throw new Error('Permission denied (403) — token needs "repo" scope')
  } else {
    const errBody = await shaRes.json().catch(() => ({}))
    throw new Error(`GitHub error ${shaRes.status}: ${errBody.message || 'unknown'}`)
  }

  // Step 2: encode content
  const jsonStr = JSON.stringify(content, null, 2)
  const base64  = btoa(unescape(encodeURIComponent(jsonStr)))
  console.log('[GitHub save] Payload:', jsonStr.length, 'chars /', base64.length, 'base64 chars')

  // Step 3: commit via PUT
  const body = { message: 'Update portfolio content', content: base64, ...(sha ? { sha } : {}) }

  console.log('[GitHub save] Sending PUT...')
  let res
  try {
    res = await fetch(API_URL, { method: 'PUT', headers: apiHeaders(token), body: JSON.stringify(body) })
  } catch {
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
  if (result.content?.sha) {
    localStorage.setItem(SHA_KEY, result.content.sha)
    console.log('[GitHub save] New SHA cached:', result.content.sha.slice(0, 8) + '...')
  }
  console.log('[GitHub save] Save successful!')
  return result
}
