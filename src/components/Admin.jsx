import { useState, useEffect, useRef } from 'react'
import { getGithubConfig, saveGithubConfig, clearGithubConfig, saveContentToGithub, getTokenExpiration, restoreFromBackup } from '../lib/github'

const DOT = String.fromCharCode(183)
const PIN_KEY = 'portfolio_admin_pin'

function grammarClean(s) {
  if (typeof s !== 'string') return s
  if (s.startsWith('data:') || s.startsWith('http') || s.startsWith('blob:') || s.length > 8000) return s
  return s
    .replace(/  +/g, ' ')
    .replace(/([,;:])([^\s\n])/g, '$1 $2')
    .replace(/([.!?])([a-zA-Z])/g, '$1 $2')
    .replace(/!{2,}/g, '!')
    .replace(/\.{2}(?!\.)/g, '.')
    .split('\n').map(line => line.trim()).join('\n')
    .trim()
}
function grammarCleanDeep(obj) {
  if (typeof obj === 'string') return grammarClean(obj)
  if (Array.isArray(obj)) return obj.map(grammarCleanDeep)
  if (obj && typeof obj === 'object') {
    const r = {}
    for (const k of Object.keys(obj)) r[k] = grammarCleanDeep(obj[k])
    return r
  }
  return obj
}
const DEFAULT_PIN = '1234'
const EMPTY_CS_IMAGES = Array.from({ length: 10 }, () => ({ src: null, caption: '' }))

function getPin() {
  return localStorage.getItem(PIN_KEY) || DEFAULT_PIN
}

export default function Admin({ content, onSave, onClose, showToast }) {
  const [view, setView] = useState('pin') // 'pin' | 'github-setup' | 'main'
  const [pin, setPin] = useState('')
  const [pinShake, setPinShake] = useState(false)
  const [ec, setEc] = useState(() => JSON.parse(JSON.stringify(content)))
  const [saving, setSaving] = useState(false)
  const [savingMsg, setSavingMsg] = useState('')
  const [saveError, setSaveError] = useState('')
  const savingTimerRef = useRef(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState('')
  const [tab, setTab] = useState('hero')
  const [addingProj, setAddingProj] = useState(false)
  const [editProjId, setEditProjId] = useState(null)
  const [newProj, setNewProj] = useState({ title: '', description: '', stack: '', link: '' })
  const [addingExp, setAddingExp] = useState(false)
  const [newExp, setNewExp] = useState({ company: '', role: '', initials: '', logo: null })
  const [ghForm, setGhForm] = useState({ token: '' })
  const [tokenInfo, setTokenInfo] = useState(null)
  const [tokenChecking, setTokenChecking] = useState(false)
  const pinRef = useRef()

  useEffect(() => {
    if (view === 'pin') pinRef.current?.focus()
  }, [view])

  useEffect(() => {
    if (view !== 'main') return
    // Show cached expiry instantly, then refresh live
    try {
      const meta = JSON.parse(localStorage.getItem('portfolio_token_meta') || 'null')
      if (meta?.expires) {
        const date = new Date(meta.expires.replace(' UTC', 'Z').replace(' ', 'T'))
        const days = Math.ceil((date - Date.now()) / 86400000)
        setTokenInfo({ expires: date, days })
      }
    } catch { /* ignore */ }
    checkToken()
  }, [view])

  async function checkToken() {
    setTokenChecking(true)
    const result = await getTokenExpiration()
    setTokenInfo(result)
    setTokenChecking(false)
  }

  function submitPin(e) {
    e.preventDefault()
    if (pin === getPin()) {
      const cfg = getGithubConfig()
      setPin('')
      setView(cfg?.token ? 'main' : 'github-setup')
    } else {
      setPinShake(true)
      setPin('')
      setTimeout(() => setPinShake(false), 500)
    }
  }

  function submitGithub(e) {
    e.preventDefault()
    saveGithubConfig({ token: ghForm.token })
    setView('main')
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')

    const cleaned = grammarCleanDeep(ec)
    const grammarChanged = JSON.stringify(cleaned) !== JSON.stringify(ec)
    if (grammarChanged) setEc(cleaned)

    setSavingMsg(grammarChanged ? 'Auto-correcting grammar...' : 'Saving...')

    clearTimeout(savingTimerRef.current)
    savingTimerRef.current = setTimeout(() => setSavingMsg('Still saving, please wait...'), 5000)

    const toSave = grammarChanged ? cleaned : ec
    let lastErr
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt === 1) {
        setSavingMsg('Retrying...')
        await new Promise(r => setTimeout(r, 1200))
      }
      try {
        await saveContentToGithub(toSave)
        clearTimeout(savingTimerRef.current)
        onSave(toSave)
        showToast(grammarChanged ? 'Grammar cleaned & deployed ✓' : 'Changes saved & deployed ✓')
        onClose()
        return
      } catch (err) {
        lastErr = err
      }
    }

    clearTimeout(savingTimerRef.current)
    onSave(toSave)
    localStorage.setItem('portfolio_content', JSON.stringify(toSave))
    const msg = lastErr?.message || 'Save failed — please try again'
    setSaveError(msg)
    showToast(msg, 'error')
    setSaving(false)
    setSavingMsg('')
  }

  async function handleRestore() {
    if (!window.confirm('Restore the previous version? This will overwrite current content with the last backup.')) return
    setRestoring(true)
    setRestoreError('')
    try {
      const restored = await restoreFromBackup()
      onSave(restored)
      showToast('Previous version restored ✓')
      onClose()
    } catch (err) {
      const msg = err?.message || 'Restore failed — no backup available'
      setRestoreError(msg)
      showToast(msg, 'error')
    } finally {
      setRestoring(false)
    }
  }

  function readFile(file, cb) {
    // PDFs and non-images pass through as-is
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => cb(e.target.result)
      reader.readAsDataURL(file)
      return
    }
    // Images: resize to max 1200px wide, compress to 80% JPEG
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1200
        let w = img.width
        let h = img.height
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        cb(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  function updateEc(path, val) {
    setEc(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = val
      return next
    })
  }

  function addProject() {
    if (!newProj.title.trim()) return
    const p = {
      id: Date.now().toString(),
      title: newProj.title.trim(),
      description: newProj.description.trim(),
      stack: newProj.stack.split(',').map(s => s.trim()).filter(Boolean),
      image: null,
      link: newProj.link.trim() || null,
      caseStudy: { hook: '', story: '', images: JSON.parse(JSON.stringify(EMPTY_CS_IMAGES)) },
    }
    setEc(prev => ({ ...prev, projects: [...prev.projects, p] }))
    setNewProj({ title: '', description: '', stack: '', link: '' })
    setAddingProj(false)
  }

  function addExperience() {
    if (!newExp.company.trim()) return
    const item = {
      id: Date.now().toString(),
      company: newExp.company.trim(),
      role: newExp.role.trim(),
      initials: newExp.initials.trim().slice(0, 3),
      logo: newExp.logo || null,
    }
    setEc(prev => ({ ...prev, experience: [...(prev.experience || []), item] }))
    setNewExp({ company: '', role: '', initials: '', logo: null })
    setAddingExp(false)
  }

  function delExperience(id) {
    setEc(prev => ({ ...prev, experience: (prev.experience || []).filter(e => e.id !== id) }))
  }

  function updateExpField(id, field, val) {
    setEc(prev => ({
      ...prev,
      experience: (prev.experience || []).map(e => e.id === id ? { ...e, [field]: val } : e),
    }))
  }

  function delProject(id) {
    setEc(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }))
    if (editProjId === id) setEditProjId(null)
  }

  function updateProject(id, field, val) {
    setEc(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, [field]: val } : p),
    }))
  }

  function updateProjCaseStudy(id, field, val) {
    setEc(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === id
          ? { ...p, caseStudy: { ...(p.caseStudy || {}), [field]: val } }
          : p
      ),
    }))
  }

  function updateProjCaseStudyImage(id, imgIdx, field, val) {
    setEc(prev => ({
      ...prev,
      projects: prev.projects.map(p => {
        if (p.id !== id) return p
        const imgs = [...((p.caseStudy?.images) || JSON.parse(JSON.stringify(EMPTY_CS_IMAGES)))]
        imgs[imgIdx] = { ...imgs[imgIdx], [field]: val }
        return { ...p, caseStudy: { ...(p.caseStudy || {}), images: imgs } }
      }),
    }))
  }

  // ── PIN View ──────────────────────────────────────────────
  if (view === 'pin') {
    return (
      <div className="adm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="adm-modal">
          <div className="adm-header">
            <span className="adm-header-title">Admin</span>
            <button className="adm-x" onClick={onClose}>✕</button>
          </div>
          <div className="adm-body">
            <form className="pin-view" onSubmit={submitPin}>
              <p className="pin-heading">Enter PIN</p>
              <p className="pin-sub">Default PIN is 1234</p>
              <input
                ref={pinRef}
                type="password"
                maxLength={8}
                value={pin}
                onChange={e => setPin(e.target.value)}
                className={`pin-input${pinShake ? ' shake' : ''}`}
                placeholder="••••"
                autoComplete="off"
              />
              {pinShake && <p className="pin-err">Incorrect PIN</p>}
              <button type="submit" className="btn-primary">Continue →</button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── GitHub Setup View ─────────────────────────────────────
  if (view === 'github-setup') {
    return (
      <div className="adm-overlay">
        <div className="adm-modal">
          <div className="adm-header">
            <span className="adm-header-title">GitHub Token</span>
            <button className="adm-x" onClick={onClose}>✕</button>
          </div>
          <div className="adm-body">
            <div className="setup-view">
              <p className="setup-heading">Enter your GitHub token</p>
              <p className="setup-desc">
                Saves commit <code>content.json</code> to{' '}
                <strong>tyresemosley8-art/Portfolio</strong> and Vercel auto-redeploys.
                Create a Personal Access Token at{' '}
                <strong>github.com → Settings → Developer settings → Personal access tokens</strong>{' '}
                with <code>repo</code> scope.
              </p>
              <form style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={submitGithub}>
                <div className="fgroup">
                  <label className="flabel">Personal Access Token</label>
                  <input
                    type="password" className="finput" placeholder="ghp_..."
                    value={ghForm.token}
                    onChange={e => setGhForm(p => ({ ...p, token: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                  <button type="submit" className="btn-primary">Save & Continue</button>
                  <button
                    type="button" className="btn-sm"
                    onClick={() => setView('main')}
                  >
                    Skip for now
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main Admin View ────────────────────────────────────────
  return (
    <div className="adm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal">
        <div className="adm-header">
          <span className="adm-header-title">Admin Panel</span>
          <button className="adm-x" onClick={onClose}>✕</button>
        </div>

        <div className="token-bar">
          {tokenInfo?.error === 'no-config' ? (
            <span className="tb-text tb-neutral">GitHub not connected</span>
          ) : tokenInfo?.error === 'invalid' ? (
            <span className="tb-text tb-bad">
              Token invalid or expired —{' '}
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">renew at GitHub</a>
            </span>
          ) : tokenInfo?.error ? (
            <span className="tb-text tb-neutral">Could not reach GitHub</span>
          ) : !tokenInfo ? (
            <span className="tb-text tb-neutral">Checking token…</span>
          ) : tokenInfo.expires === null ? (
            <span className="tb-text tb-good">Token: no expiration set</span>
          ) : tokenInfo.days <= 0 ? (
            <span className="tb-text tb-bad">
              Token expired —{' '}
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">renew at GitHub</a>
            </span>
          ) : tokenInfo.days <= 10 ? (
            <span className="tb-text tb-bad">
              Token expires in {tokenInfo.days} day{tokenInfo.days !== 1 ? 's' : ''} —{' '}
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">renew now</a>
            </span>
          ) : tokenInfo.days <= 30 ? (
            <span className="tb-text tb-warn">
              Token expires in {tokenInfo.days} days —{' '}
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">renew soon</a>
            </span>
          ) : (
            <span className="tb-text tb-good">
              Token valid · {tokenInfo.days} days remaining
            </span>
          )}
          <button
            className="tb-refresh"
            onClick={checkToken}
            disabled={tokenChecking}
            title="Refresh token status"
          >
            {tokenChecking ? '…' : '↺'}
          </button>
        </div>

        <div className="adm-tabs">
          {['hero', 'about', 'projects', 'experience', 'quote', 'contact', 'resume'].map(t => (
            <button
              key={t}
              className={`adm-tab${tab === t ? ' on' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="adm-body">

          {/* ── HERO TAB ── */}
          {tab === 'hero' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fgroup">
                <label className="flabel">Name</label>
                <input className="finput" value={ec.hero.name}
                  onChange={e => updateEc('hero.name', e.target.value)} />
              </div>
              <div className="fgroup">
                <label className="flabel">Subtitle / tagline</label>
                <input className="finput" value={ec.hero.subtitle}
                  onChange={e => updateEc('hero.subtitle', e.target.value)} />
              </div>
              <div className="fgroup">
                <label className="flabel">Profile photo</label>
                <input type="file" accept="image/*" id="photo-up" style={{ display: 'none' }}
                  onChange={e => readFile(e.target.files[0], v => updateEc('profilePhoto', v))} />
                <label htmlFor="photo-up" className="upload-btn">
                  {ec.profilePhoto ? '↺ Change Photo' : '+ Upload Photo'}
                </label>
                {ec.profilePhoto && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <img src={ec.profilePhoto} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }} />
                    <button className="btn-sm danger" onClick={() => updateEc('profilePhoto', null)}>Remove</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ABOUT TAB ── */}
          {tab === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fgroup">
                <label className="flabel">Section heading</label>
                <input className="finput"
                  value={ec.about.heading || ''}
                  placeholder="Who I am"
                  onChange={e => updateEc('about.heading', e.target.value)} />
              </div>
              <div className="fgroup">
                <label className="flabel">Bio paragraph</label>
                <textarea className="ftextarea" rows={5}
                  value={ec.about.bio}
                  onChange={e => updateEc('about.bio', e.target.value)} />
              </div>
              <div className="fgroup">
                <label className="flabel">Journey paragraph</label>
                <textarea className="ftextarea" rows={5}
                  value={ec.about.journey}
                  onChange={e => updateEc('about.journey', e.target.value)} />
              </div>
              <div className="fgroup">
                <label className="flabel">Signature line</label>
                <span className="fhint">Shown below the bio in small caps</span>
                <input className="finput"
                  value={ec.about.footer || ''}
                  placeholder={'Philadelphia, PA ' + DOT + ' Posse Scholar ' + DOT + ' Information Science'}
                  onChange={e => updateEc('about.footer', e.target.value)} />
              </div>
              <div className="fgroup">
                <label className="flabel">About section photo</label>
                <span className="fhint">Shown in the About grid (separate from hero photo)</span>
                <input type="file" accept="image/*" id="about-photo-up" style={{ display: 'none' }}
                  onChange={e => readFile(e.target.files[0], v => updateEc('about.photo', v))} />
                <label htmlFor="about-photo-up" className="upload-btn" style={{ marginTop: 4 }}>
                  {ec.about.photo ? '↺ Change About Photo' : '+ Upload About Photo'}
                </label>
                {ec.about.photo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <img src={ec.about.photo} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }} />
                    <button className="btn-sm danger" onClick={() => updateEc('about.photo', null)}>Remove</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PROJECTS TAB ── */}
          {tab === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="fgroup" style={{ marginBottom: 4 }}>
                <label className="flabel">Section heading</label>
                <input className="finput"
                  value={ec.projectsHeading || ''}
                  placeholder="Things I've built"
                  onChange={e => setEc(p => ({ ...p, projectsHeading: e.target.value }))} />
              </div>

              <div className="proj-list">
                {ec.projects.map(p => (
                  editProjId === p.id ? (
                    <div key={p.id} className="new-proj-form">
                      <p className="new-proj-form-title">Editing — {p.title}</p>

                      <input className="finput" placeholder="Title" value={p.title}
                        onChange={e => updateProject(p.id, 'title', e.target.value)} />
                      <textarea className="ftextarea" rows={3} placeholder="Short description (shown on card)"
                        value={p.description}
                        onChange={e => updateProject(p.id, 'description', e.target.value)} />
                      <input className="finput" placeholder="Stack: React, Node.js, PostgreSQL"
                        value={p.stack.join(', ')}
                        onChange={e => updateProject(p.id, 'stack',
                          e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
                      <input className="finput" placeholder="Link (optional)" value={p.link || ''}
                        onChange={e => updateProject(p.id, 'link', e.target.value || null)} />

                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <input type="file" accept="image/*" id={`img-${p.id}`} style={{ display: 'none' }}
                          onChange={e => readFile(e.target.files[0], v => updateProject(p.id, 'image', v))} />
                        <label htmlFor={`img-${p.id}`} className="upload-btn" style={{ fontSize: 12 }}>
                          {p.image ? '↺ Card image' : '+ Card image'}
                        </label>
                      </div>

                      {/* ── Case Study section ── */}
                      <div className="cs-admin-section">
                        <p className="cs-admin-label">Case Study</p>
                        <div className="fgroup">
                          <label className="flabel">Hook — one sentence</label>
                          <input
                            className="finput"
                            placeholder="e.g. Replaced 5 disconnected tools with one platform."
                            value={p.caseStudy?.hook || ''}
                            onChange={e => updateProjCaseStudy(p.id, 'hook', e.target.value)}
                          />
                        </div>
                        <div className="fgroup">
                          <label className="flabel">Story</label>
                          <span className="fhint">Write in paragraphs — separate with a blank line</span>
                          <textarea
                            className="ftextarea"
                            rows={8}
                            placeholder="Paragraph one about the problem...\n\nParagraph two about your solution..."
                            value={p.caseStudy?.story || ''}
                            onChange={e => updateProjCaseStudy(p.id, 'story', e.target.value)}
                            style={{ minHeight: 140 }}
                          />
                        </div>
                        <p className="fhint" style={{ marginTop: 4 }}>Up to 10 images — placed between paragraphs</p>
                        {Array.from({ length: 10 }, (_, i) => i).map(imgIdx => (
                          <div key={imgIdx} className="cs-img-row">
                            <span className="fhint">Image {imgIdx + 1}</span>
                            {p.caseStudy?.images?.[imgIdx]?.src && (
                              <img
                                src={p.caseStudy.images[imgIdx].src}
                                alt=""
                                className="cs-img-preview"
                              />
                            )}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                              <input
                                type="file" accept="image/*"
                                id={`cs-img-${p.id}-${imgIdx}`}
                                style={{ display: 'none' }}
                                onChange={e => readFile(e.target.files[0], v =>
                                  updateProjCaseStudyImage(p.id, imgIdx, 'src', v)
                                )}
                              />
                              <label htmlFor={`cs-img-${p.id}-${imgIdx}`} className="upload-btn" style={{ fontSize: 12 }}>
                                {p.caseStudy?.images?.[imgIdx]?.src ? '↺ Change' : '+ Upload'}
                              </label>
                              {p.caseStudy?.images?.[imgIdx]?.src && (
                                <button
                                  className="btn-sm danger"
                                  onClick={() => updateProjCaseStudyImage(p.id, imgIdx, 'src', null)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <input
                              className="finput"
                              placeholder="Caption (optional)"
                              value={p.caseStudy?.images?.[imgIdx]?.caption || ''}
                              onChange={e => updateProjCaseStudyImage(p.id, imgIdx, 'caption', e.target.value)}
                            />
                          </div>
                        ))}
                      </div>

                      <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => setEditProjId(null)}>
                        Done
                      </button>
                    </div>
                  ) : (
                    <div key={p.id} className="proj-item">
                      <div>
                        <p className="proj-item-name">{p.title}</p>
                        <p className="proj-item-stack">{p.stack.join(' ' + DOT + ' ')}</p>
                      </div>
                      <div className="proj-item-actions">
                        <button className="btn-sm" onClick={() => setEditProjId(p.id)}>Edit</button>
                        <button className="btn-sm danger" onClick={() => delProject(p.id)}>Delete</button>
                      </div>
                    </div>
                  )
                ))}
              </div>

              {addingProj ? (
                <div className="new-proj-form">
                  <p className="new-proj-form-title">New Project</p>
                  <input className="finput" placeholder="Title *"
                    value={newProj.title}
                    onChange={e => setNewProj(p => ({ ...p, title: e.target.value }))} />
                  <textarea className="ftextarea" rows={3} placeholder="Description"
                    value={newProj.description}
                    onChange={e => setNewProj(p => ({ ...p, description: e.target.value }))} />
                  <input className="finput" placeholder="Stack: React, Node.js, PostgreSQL"
                    value={newProj.stack}
                    onChange={e => setNewProj(p => ({ ...p, stack: e.target.value }))} />
                  <input className="finput" placeholder="Link (optional)"
                    value={newProj.link}
                    onChange={e => setNewProj(p => ({ ...p, link: e.target.value }))} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" onClick={addProject} disabled={!newProj.title.trim()}>
                      Add Project
                    </button>
                    <button className="btn-sm" onClick={() => setAddingProj(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="upload-btn" style={{ alignSelf: 'flex-start' }}
                  onClick={() => setAddingProj(true)}>
                  + Add Project
                </button>
              )}
            </div>
          )}

          {/* ── QUOTE TAB ── */}
          {tab === 'quote' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fgroup">
                <label className="flabel">Verse text</label>
                <textarea className="ftextarea" rows={4}
                  value={ec.quote?.verse || ''}
                  placeholder="Yet what we suffer now is nothing compared to the glory he will reveal to us later."
                  onChange={e => setEc(p => ({ ...p, quote: { ...(p.quote || {}), verse: e.target.value } }))} />
              </div>
              <div className="fgroup">
                <label className="flabel">Citation</label>
                <input className="finput"
                  value={ec.quote?.citation || ''}
                  placeholder="Romans 8:18 — NLT"
                  onChange={e => setEc(p => ({ ...p, quote: { ...(p.quote || {}), citation: e.target.value } }))} />
              </div>
            </div>
          )}

          {/* ── EXPERIENCE TAB ── */}
          {tab === 'experience' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="fhint" style={{ marginBottom: 4 }}>
                These items scroll in the Experience marquee. Changes save with the rest of the content.
              </p>
              <div className="proj-list">
                {(ec.experience || []).map(item => (
                  <div key={item.id} className="new-proj-form" style={{ gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                        background: item.logo ? 'rgba(10,22,40,0.07)' : 'var(--navy)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.logo
                          ? <img src={item.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <span style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>{item.initials}</span>
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <p className="proj-item-name">{item.company}</p>
                        <p className="proj-item-stack">{item.role}</p>
                      </div>
                      <button className="btn-sm danger" onClick={() => delExperience(item.id)}>Delete</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file" accept="image/*"
                        id={`exp-logo-${item.id}`} style={{ display: 'none' }}
                        onChange={e => readFile(e.target.files[0], v => updateExpField(item.id, 'logo', v))}
                      />
                      <label htmlFor={`exp-logo-${item.id}`} className="upload-btn" style={{ fontSize: 12 }}>
                        {item.logo ? '↺ Change Logo' : '+ Upload Logo'}
                      </label>
                      {item.logo && (
                        <button className="btn-sm danger" onClick={() => updateExpField(item.id, 'logo', null)}>
                          Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {addingExp ? (
                <div className="new-proj-form">
                  <p className="new-proj-form-title">New Experience Item</p>
                  <input className="finput" placeholder="Company name *"
                    value={newExp.company}
                    onChange={e => setNewExp(p => ({ ...p, company: e.target.value }))} />
                  <input className="finput" placeholder="Role or title"
                    value={newExp.role}
                    onChange={e => setNewExp(p => ({ ...p, role: e.target.value }))} />
                  <input className="finput" placeholder="Initials (max 3, e.g. WP — used if no logo)"
                    maxLength={3} value={newExp.initials}
                    onChange={e => setNewExp(p => ({ ...p, initials: e.target.value }))} />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="file" accept="image/*"
                      id="new-exp-logo" style={{ display: 'none' }}
                      onChange={e => readFile(e.target.files[0], v => setNewExp(p => ({ ...p, logo: v })))}
                    />
                    <label htmlFor="new-exp-logo" className="upload-btn" style={{ fontSize: 12 }}>
                      {newExp.logo ? '↺ Change Logo' : '+ Upload Logo (optional)'}
                    </label>
                    {newExp.logo && (
                      <img src={newExp.logo} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', background: 'rgba(10,22,40,0.07)', padding: 4 }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" onClick={addExperience} disabled={!newExp.company.trim()}>
                      Add Item
                    </button>
                    <button className="btn-sm" onClick={() => setAddingExp(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="upload-btn" style={{ alignSelf: 'flex-start' }}
                  onClick={() => setAddingExp(true)}>
                  + Add Item
                </button>
              )}
            </div>
          )}

          {/* ── CONTACT TAB ── */}
          {tab === 'contact' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fgroup">
                <label className="flabel">Email address</label>
                <input className="finput" type="email" placeholder="you@example.com"
                  value={ec.contact?.email || ''}
                  onChange={e => setEc(p => ({ ...p, contact: { ...(p.contact || {}), email: e.target.value } }))} />
              </div>
              <div className="fgroup">
                <label className="flabel">LinkedIn URL</label>
                <input className="finput" placeholder="https://linkedin.com/in/..."
                  value={ec.contact?.linkedin || ''}
                  onChange={e => setEc(p => ({ ...p, contact: { ...(p.contact || {}), linkedin: e.target.value } }))} />
              </div>
              <div className="fgroup">
                <label className="flabel">GitHub URL</label>
                <input className="finput" placeholder="https://github.com/..."
                  value={ec.contact?.github || ''}
                  onChange={e => setEc(p => ({ ...p, contact: { ...(p.contact || {}), github: e.target.value } }))} />
              </div>
              <div className="fgroup">
                <label className="flabel">Subtext / tagline</label>
                <input className="finput" placeholder="Open to internships, opportunities, and conversations."
                  value={ec.contact?.subtext || ''}
                  onChange={e => setEc(p => ({ ...p, contact: { ...(p.contact || {}), subtext: e.target.value } }))} />
              </div>
            </div>
          )}

          {/* ── RESUME TAB ── */}
          {tab === 'resume' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fgroup">
                <label className="flabel">Section heading</label>
                <input className="finput"
                  value={ec.resumeHeading || ''}
                  placeholder="Download my resume"
                  onChange={e => setEc(p => ({ ...p, resumeHeading: e.target.value }))} />
              </div>
              <div className="fgroup">
                <label className="flabel">Upload PDF</label>
                <span className="fhint">Stored as base64 in content.json — keep under 1 MB</span>
                <input type="file" accept=".pdf,application/pdf" id="resume-up" style={{ display: 'none' }}
                  onChange={e => readFile(e.target.files[0], v => setEc(p => ({ ...p, resume: v })))} />
                <label htmlFor="resume-up" className="upload-btn" style={{ marginTop: 6 }}>
                  {ec.resume ? '↺ Replace Resume' : '+ Upload Resume PDF'}
                </label>
                {ec.resume && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--slate)' }}>✓ PDF ready</span>
                    <button className="btn-sm danger" onClick={() => setEc(p => ({ ...p, resume: null }))}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="fgroup">
                <label className="flabel">— or paste a URL instead —</label>
                <input className="finput" placeholder="https://drive.google.com/..."
                  value={typeof ec.resume === 'string' && ec.resume.startsWith('http') ? ec.resume : ''}
                  onChange={e => setEc(p => ({ ...p, resume: e.target.value || null }))} />
              </div>
            </div>
          )}

        </div>

        <div className="adm-footer">
          <div className="adm-meta">
            <button className="adm-meta-btn" onClick={() => {
              const p = prompt('New PIN (min 4 digits):')
              if (p && p.length >= 4) {
                localStorage.setItem(PIN_KEY, p)
                showToast('PIN updated')
              }
            }}>
              Change PIN
            </button>
            <button className="adm-meta-btn" onClick={() => {
              clearGithubConfig()
              setView('github-setup')
            }}>
              Reconnect GitHub
            </button>
          </div>
          <div className="adm-footer-right">
            {saveError && (
              <p className="save-error-line">
                {saveError}{' '}
                <button className="save-retry-btn" onClick={handleSave}>Retry</button>
              </p>
            )}
            {restoreError && (
              <p className="save-error-line">{restoreError}</p>
            )}
            <button className="adm-save-btn" onClick={handleSave} disabled={saving || restoring}>
              {saving ? savingMsg : '↑ Save & Deploy'}
            </button>
            <button className="adm-restore-btn" onClick={handleRestore} disabled={saving || restoring}>
              {restoring ? 'Restoring...' : '↩ Restore previous version'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
