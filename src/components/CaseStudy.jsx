import { useState, useEffect, useRef } from 'react'

export default function CaseStudy({ project, onClose }) {
  const [closing, setClosing] = useState(false)
  const overlayRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Scroll reveal scoped to the overlay's scroll container
  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px', root: el }
    )
    const raf = requestAnimationFrame(() => {
      el.querySelectorAll('.cs-reveal').forEach(node => io.observe(node))
    })
    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [])

  function handleClose() {
    setClosing(true)
    setTimeout(onClose, 300)
  }

  const cs = project.caseStudy || {}
  const paragraphs = cs.story ? cs.story.split(/\n\n+/).filter(p => p.trim()) : []
  const images = (cs.images || []).filter(img => img?.src)

  // Interleave images between every 2 paragraphs
  const blocks = []
  let imgIdx = 0
  paragraphs.forEach((para, i) => {
    blocks.push({ type: 'para', content: para, key: `p-${i}` })
    if ((i + 1) % 2 === 0 && imgIdx < images.length) {
      blocks.push({ type: 'img', img: images[imgIdx], key: `img-${imgIdx}` })
      imgIdx++
    }
  })
  while (imgIdx < images.length) {
    blocks.push({ type: 'img', img: images[imgIdx], key: `img-${imgIdx}` })
    imgIdx++
  }

  return (
    <div ref={overlayRef} className={`case-overlay${closing ? ' exiting' : ''}`}>
      <button className="case-back-btn" onClick={handleClose}>← Back</button>

      <div className="case-container">
        <div className="case-hero-section">
          <h1 className="case-title cs-reveal">{project.title}</h1>
          <p className="case-hook cs-reveal">{cs.hook || project.description}</p>
          {project.stack?.length > 0 && (
            <div className="case-stack cs-reveal">
              {project.stack.map(t => <span key={t} className="stack-tag">{t}</span>)}
            </div>
          )}
        </div>

        <div className="case-story">
          {blocks.length > 0 ? blocks.map(block =>
            block.type === 'para' ? (
              <p key={block.key} className="case-para cs-reveal">{block.content}</p>
            ) : (
              <div key={block.key} className="case-img-wrap cs-reveal">
                <img src={block.img.src} alt={block.img.caption || ''} className="case-img" />
                {block.img.caption && (
                  <p className="case-img-caption">{block.img.caption}</p>
                )}
              </div>
            )
          ) : (
            <p className="case-para cs-reveal" style={{ color: 'var(--slate)', fontStyle: 'italic' }}>
              Case study coming soon.
            </p>
          )}
        </div>

        {project.link && (
          <div className="case-footer cs-reveal">
            <a href={project.link} target="_blank" rel="noopener noreferrer" className="case-ext-link">
              View live project ↗
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
