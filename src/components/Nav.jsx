import { useEffect, useState } from 'react'

export default function Nav({ name }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [wordmarkVisible, setWordmarkVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Hide wordmark when hero is in view; show when hero scrolls away
  useEffect(() => {
    const hero = document.getElementById('hero')
    if (!hero) return
    const io = new IntersectionObserver(
      ([entry]) => setWordmarkVisible(!entry.isIntersecting),
      { threshold: 0.15 }
    )
    io.observe(hero)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function scrollTo(id) {
    setOpen(false)
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 320)
  }

  return (
    <>
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <button
          className={`hamburger${open ? ' open' : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <span className="hline" />
          <span className="hline" />
          <span className="hline" />
        </button>
        <span className={`nav-wordmark${wordmarkVisible ? ' visible' : ''}`}>
          {name || 'Tyrese Mosley'}
        </span>
      </nav>

      <div className={`nav-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      <div className={`nav-panel${open ? ' open' : ''}`}>
        <button className="nav-panel-close" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
        <div className="nav-panel-links">
          {[['about', 'About'], ['projects', 'Projects'], ['resume', 'Resume']].map(([id, label]) => (
            <button key={id} className="nav-link-btn" onClick={() => scrollTo(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="nav-panel-foot">Tyrese Mosley</div>
      </div>
    </>
  )
}
