// ── Hardcoded repo (never changes) ───────────────────────────
const REPO_OWNER = 'tyresemosley8-art'
const REPO_NAME  = 'Portfolio'
const BRANCH     = 'master'

const RAW_URL        = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/content.json`
const API_URL        = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/content.json`
const BACKUP_RAW_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/content.backup.json`
const BACKUP_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/content.backup.json`

const TOKEN_KEY    = 'portfolio_github_token'
const TOKEN_META   = 'portfolio_token_meta'   // stores { expires: string }
const SHA_KEY      = 'portfolio_content_sha'
const BACKUP_SHA_KEY = 'portfolio_backup_sha'

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

// ── Backup helpers ────────────────────────────────────────────
async function saveBackup(token, currentBase64) {
  if (!currentBase64) return
  const cleanBase64 = currentBase64.replace(/\n/g, '')

  let backupSha = localStorage.getItem(BACKUP_SHA_KEY)
  if (!backupSha) {
    try {
      const r = await fetch(BACKUP_API_URL, { headers: apiHeaders(token) })
      if (r.ok) {
        const d = await r.json()
        backupSha = d.sha
        localStorage.setItem(BACKUP_SHA_KEY, backupSha)
      }
    } catch { /* ignore */ }
  }

  async function doPut(sha) {
    return fetch(BACKUP_API_URL, {
      method: 'PUT',
      headers: apiHeaders(token),
      body: JSON.stringify({
        message: 'Backup content.json before update',
        content: cleanBase64,
        ...(sha ? { sha } : {}),
      }),
    })
  }

  try {
    let r = await doPut(backupSha)
    if (r.status === 409 || r.status === 422) {
      // SHA mismatch — fetch fresh and retry once
      const shaRes = await fetch(BACKUP_API_URL, { headers: apiHeaders(token) })
      if (shaRes.ok) {
        const d = await shaRes.json()
        backupSha = d.sha
        localStorage.setItem(BACKUP_SHA_KEY, backupSha)
        r = await doPut(backupSha)
      }
    }
    if (r.ok) {
      const d = await r.json()
      if (d.content?.sha) localStorage.setItem(BACKUP_SHA_KEY, d.content.sha)
      console.log('[GitHub backup] Backup saved successfully')
    } else {
      console.warn('[GitHub backup] Backup write failed (non-critical):', r.status)
    }
  } catch (e) {
    console.warn('[GitHub backup] Backup error (non-critical):', e)
  }
}

// ── Video upload: GitHub Release assets ──────────────────────
const RELEASES_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`

async function getOrCreateMediaRelease(token) {
  const res = await fetch(`${RELEASES_API}/tags/portfolio-media`, { headers: apiHeaders(token) })
  if (res.ok) return res.json()
  const createRes = await fetch(RELEASES_API, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify({
      tag_name: 'portfolio-media',
      name: 'Portfolio Media',
      body: 'Video assets for portfolio case studies.',
      prerelease: true,
    }),
  })
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}))
    throw new Error(`Could not create media release: ${err.message || createRes.status}`)
  }
  return createRes.json()
}

export async function uploadVideoToGithub(file, onProgress, onCancel) {
  const token = getToken()
  if (!token) throw new Error('No GitHub token — open Settings and enter your token')

  const release = await getOrCreateMediaRelease(token)

  // Remove existing asset with same filename to avoid duplicates
  const existing = (release.assets || []).find(a => a.name === file.name)
  if (existing) {
    await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${existing.id}`, {
      method: 'DELETE', headers: apiHeaders(token),
    }).catch(() => {})
  }

  const uploadUrl = `https://uploads.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/${release.id}/assets?name=${encodeURIComponent(file.name)}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    if (onCancel) onCancel(() => { xhr.abort(); reject(new Error('Upload cancelled')) })

    xhr.open('POST', uploadUrl)
    xhr.setRequestHeader('Authorization', `token ${token}`)
    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json')
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText).browser_download_url) }
        catch { reject(new Error('Invalid response from GitHub')) }
      } else {
        let msg = `Upload failed (${xhr.status})`
        try { msg = JSON.parse(xhr.responseText).message || msg } catch {}
        if (xhr.status === 401) msg = 'Token rejected — check your GitHub token'
        if (xhr.status === 422) msg = 'File already exists or name is invalid'
        reject(new Error(msg))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))
    xhr.send(file)
  })
}

export async function restoreFromBackup() {
  const res = await fetch(BACKUP_RAW_URL, { cache: 'no-cache' })
  if (!res.ok) throw new Error('No backup found — save at least once to create a backup')
  const backupContent = await res.json()
  // saveContentToGithub will back up the current content before overwriting
  await saveContentToGithub(backupContent)
  return backupContent
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
    // Back up the current content before overwriting
    await saveBackup(token, shaData.content || '')
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
