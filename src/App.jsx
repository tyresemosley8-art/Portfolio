import { useState, useEffect, useRef } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import About from './components/About'
import Experience from './components/Experience'
import Projects from './components/Projects'
import Resume from './components/Resume'
import Admin from './components/Admin'
import CaseStudy from './components/CaseStudy'
import Quote from './components/Quote'
import Cursor from './components/Cursor'
import TopoCanvas from './components/TopoCanvas'
import Toast from './components/Toast'
import { fetchContentFromGithub } from './lib/github'
import { DEFAULT_CONTENT } from './lib/defaultContent'

export default function App() {
  const [content, setContent] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [openProject, setOpenProject] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  // ── Load content ─────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const result = await fetchContentFromGithub()
        if (result?.content) {
          setContent(result.content)
          localStorage.setItem('portfolio_content', JSON.stringify(result.content))
          return
        }
      } catch { /* fall through */ }

      const cached = localStorage.getItem('portfolio_content')
      if (cached) {
        try { setContent(JSON.parse(cached)); return } catch { /* fall through */ }
      }

      setContent(DEFAULT_CONTENT)
    }
    load()
  }, [])

  // ── Scroll reveal — bidirectional ─────────────────────────
  useEffect(() => {
    if (!content) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        e.target.classList.toggle('visible', e.isIntersecting)
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    })
    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [content])

  // ── Keyboard shortcut: Shift+T then Shift+M within 2s ───
  useEffect(() => {
    let tPressed = false
    let timer = null
    const onDown = e => {
      if (e.shiftKey && e.key === 'T') {
        tPressed = true
        clearTimeout(timer)
        timer = setTimeout(() => { tPressed = false }, 2000)
      }
      if (e.shiftKey && e.key === 'M' && tPressed) {
        tPressed = false
        clearTimeout(timer)
        setAdminOpen(true)
      }
    }
    window.addEventListener('keydown', onDown)
    return () => { window.removeEventListener('keydown', onDown); clearTimeout(timer) }
  }, [])

  function showToast(message, type = 'success') {
    clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  function handleSave(newContent) {
    setContent(newContent)
    localStorage.setItem('portfolio_content', JSON.stringify(newContent))
  }

  if (!content) {
    return (
      <div className="loading-screen">
        <div className="loading-dot" />
      </div>
    )
  }

  return (
    <>
      <TopoCanvas />
      <Cursor />
      <Nav name={content.hero.name} />
      <main>
        <Hero hero={content.hero} profilePhoto={content.profilePhoto} />
        <About about={content.about} profilePhoto={content.profilePhoto} />
        <Experience experience={content.experience} />
        <Projects
          projects={content.projects}
          heading={content.projectsHeading}
          onOpenProject={setOpenProject}
        />
        <Quote quote={content.quote} />
        <Resume resume={content.resume} heading={content.resumeHeading} />
      </main>

      {openProject && (
        <CaseStudy
          project={openProject}
          onClose={() => setOpenProject(null)}
        />
      )}

      {adminOpen && (
        <Admin
          content={content}
          onSave={handleSave}
          onClose={() => setAdminOpen(false)}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}
