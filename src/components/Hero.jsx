import { useEffect, useRef } from 'react'

export default function Hero({ hero, profilePhoto }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let t = 0

    function resize() {
      const section = canvas.parentElement
      canvas.width = section.offsetWidth
      canvas.height = section.offsetHeight
    }

    function draw() {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(10, 22, 40, 0.04)'
      ctx.lineWidth = 0.8
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const LINES = 18
      const STEP = height / (LINES - 1)

      for (let i = 0; i < LINES; i++) {
        const baseY = STEP * i
        const SEGS = 140
        const pts = []

        for (let s = 0; s <= SEGS; s++) {
          const x = (width / SEGS) * s
          const a = t * 0.001 + i * 0.92
          const y = baseY
            + Math.sin(x * 0.0048 + a) * 34
            + Math.sin(x * 0.010 + a * 1.4) * 16
            + Math.sin(x * 0.0022 + a * 0.58) * 52
            + Math.cos(x * 0.007 + a * 1.15) * 12
          pts.push([x, y])
        }

        ctx.beginPath()
        ctx.moveTo(pts[0][0], pts[0][1])
        for (let s = 1; s < pts.length - 2; s++) {
          const mx = (pts[s][0] + pts[s + 1][0]) / 2
          const my = (pts[s][1] + pts[s + 1][1]) / 2
          ctx.quadraticCurveTo(pts[s][0], pts[s][1], mx, my)
        }
        const n = pts.length - 1
        ctx.quadraticCurveTo(pts[n - 1][0], pts[n - 1][1], pts[n][0], pts[n][1])
        ctx.stroke()
      }

      t++
      rafRef.current = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    resize()
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <section className="hero-section" id="hero">
      <canvas ref={canvasRef} className="hero-canvas" />
      <div className="hero">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="eyebrow-dot" />
            Philadelphia, PA
          </div>
          <h1 className="hero-name">{hero.name}</h1>
          <p className="hero-subtitle">{hero.subtitle}</p>
        </div>

        <div className="hero-photo-wrap">
          {profilePhoto ? (
            <img src={profilePhoto} alt={hero.name} className="hero-photo" />
          ) : (
            <div className="hero-photo-placeholder">
              <span style={{ fontSize: 32, opacity: 0.3 }}>👤</span>
              <span>Add photo in admin</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
