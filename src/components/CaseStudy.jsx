import { useState, useEffect, useRef } from 'react'
import TopoCanvas from './TopoCanvas'
import VideoPlayer from './VideoPlayer'

function getEmbedInfo(url) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1` }
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return { type: 'vimeo', src: `https://player.vimeo.com/video/${vm[1]}?byline=0&portrait=0&title=0` }
  return { type: 'direct', src: url }
}

export default function CaseStudy({ project, onClose }) {
  const [closing, setClosing] = useState(false)
  const overlayRef = useRef(null)

  // Lightbox state
  const [lightbox, setLightbox] = useState(null) // { images, index, tx, ty, thumbScale }
  const [lbClosing, setLbClosing] = useState(false)
  const [lbDir, setLbDir] = useState(0)    // 0=open-grow, 1=from-right, -1=from-left
  const [lbAnimKey, setLbAnimKey] = useState(0)

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

  // Keyboard handler for lightbox
  useEffect(() => {
    if (!lightbox) return
    function handler(e) {
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowLeft') lbNav(-1)
      else if (e.key === 'ArrowRight') lbNav(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox])

  function handleClose() {
    setClosing(true)
    setTimeout(onClose, 300)
  }

  function openLightbox(allImages, imgIdx, thumbEl) {
    const rect = thumbEl.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const tx = rect.left + rect.width / 2 - vw / 2
    const ty = rect.top + rect.height / 2 - vh / 2
    const thumbScale = Math.max(0.05, rect.width / Math.min(vw * 0.9, 860))
    setLightbox({ images: allImages, index: imgIdx, tx, ty, thumbScale })
    setLbDir(0)
    setLbAnimKey(k => k + 1)
    setLbClosing(false)
  }

  function closeLightbox() {
    setLbClosing(true)
    setTimeout(() => { setLightbox(null); setLbClosing(false) }, 350)
  }

  function lbNav(dir) {
    setLightbox(prev => {
      if (!prev || prev.images.length <= 1) return prev
      return { ...prev, index: (prev.index + dir + prev.images.length) % prev.images.length }
    })
    setLbDir(dir)
    setLbAnimKey(k => k + 1)
  }

  const cs = project.caseStudy || {}
  const paragraphs = cs.story ? cs.story.split(/\n\n+/).filter(p => p.trim()) : []
  const images = (cs.images || []).filter(img => img?.src)

  const isEmpty = paragraphs.length === 0 && images.length === 0

  return (
    <>
      <div ref={overlayRef} className={`case-overlay${closing ? ' exiting' : ''}`}>
        <TopoCanvas />
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
            {isEmpty ? (
              <p className="case-para cs-reveal" style={{ color: 'var(--slate)', fontStyle: 'italic' }}>
                Case study coming soon.
              </p>
            ) : (
              <>
                <div className="case-text-col">
                  {paragraphs.map((para, i) => (
                    <p key={i} className="case-para cs-reveal">{para}</p>
                  ))}
                </div>

                {images.length > 0 && (
                  <div className="case-img-col">
                    {images.map((img, i) => (
                      <div key={i} className="case-thumb-wrap">
                        <img
                          src={img.src}
                          alt={img.caption || ''}
                          className="case-thumb"
                          onClick={e => openLightbox(images, i, e.currentTarget)}
                        />
                        {img.caption && (
                          <p className="case-thumb-caption">{img.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Videos ── */}
          {(cs.videos || []).filter(v => v.url).length > 0 && (
            <div className="case-videos">
              {cs.videos.filter(v => v.url).map((video, i) => {
                const embed = getEmbedInfo(video.url)
                return (
                  <div key={i} className="case-video-item cs-reveal">
                    {video.title && <p className="case-video-title">{video.title}</p>}
                    {embed.type === 'direct' ? (
                      <VideoPlayer src={embed.src} />
                    ) : (
                      <div className="case-video-embed-wrap">
                        <iframe
                          src={embed.src}
                          className="case-video-embed"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                          title={video.title || `Video ${i + 1}`}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {project.link && (
            <div className="case-footer cs-reveal">
              <a href={project.link} target="_blank" rel="noopener noreferrer" className="case-ext-link">
                View live project ↗
              </a>
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div
          className={`lb-overlay${lbClosing ? ' closing' : ''}`}
          onClick={closeLightbox}
        >
          <div className="lb-bg" />

          <div
            key={lbAnimKey}
            className={`lb-img-wrap${lbClosing ? ' closing' : lbDir > 0 ? ' slide-from-right' : lbDir < 0 ? ' slide-from-left' : ''}`}
            style={lbDir === 0 && !lbClosing ? {
              '--lb-tx': `${lightbox.tx}px`,
              '--lb-ty': `${lightbox.ty}px`,
              '--lb-scale': lightbox.thumbScale,
            } : {}}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={lightbox.images[lightbox.index].src}
              alt={lightbox.images[lightbox.index].caption || ''}
              className="lb-img"
            />
            {lightbox.images[lightbox.index].caption && (
              <p className="lb-caption">{lightbox.images[lightbox.index].caption}</p>
            )}
          </div>

          {lightbox.images.length > 1 && (
            <>
              <button className="lb-arrow lb-prev" onClick={e => { e.stopPropagation(); lbNav(-1) }}>&#8249;</button>
              <button className="lb-arrow lb-next" onClick={e => { e.stopPropagation(); lbNav(1) }}>&#8250;</button>
            </>
          )}
          <button className="lb-close" onClick={e => { e.stopPropagation(); closeLightbox() }}>&#10005;</button>
        </div>
      )}
    </>
  )
}
