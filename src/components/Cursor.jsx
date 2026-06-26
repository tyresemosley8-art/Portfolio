import { useEffect, useRef } from 'react'

export default function Cursor() {
  const wrapRef = useRef(null)
  const pos = useRef({ x: -200, y: -200 })
  const target = useRef({ x: -200, y: -200 })
  const hovered = useRef(false)
  const rafRef = useRef(null)

  useEffect(() => {
    // Only on devices with a real mouse
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const onMove = e => {
      target.current = { x: e.clientX, y: e.clientY }
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const clickable = !!el?.closest('a, button, .proj-card, [role="button"], label, input, textarea, select')
      if (clickable !== hovered.current) {
        hovered.current = clickable
        wrapRef.current?.classList.toggle('hovered', clickable)
      }
    }

    const onDown = () => {
      wrapRef.current?.classList.add('clicked')
      setTimeout(() => wrapRef.current?.classList.remove('clicked'), 200)
    }

    function tick() {
      const LERP = 0.15
      pos.current.x += (target.current.x - pos.current.x) * LERP
      pos.current.y += (target.current.y - pos.current.y) * LERP
      if (wrapRef.current) {
        wrapRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div ref={wrapRef} className="cursor-wrap">
      <div className="cursor-body">
        <div className="cursor-h" />
        <div className="cursor-v" />
        <div className="cursor-ring" />
      </div>
    </div>
  )
}
