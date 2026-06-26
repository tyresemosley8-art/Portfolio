import { useEffect, useRef } from 'react'

export default function Cursor() {
  const wrapRef = useRef(null)
  const hovered = useRef(false)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const onMove = e => {
      if (wrapRef.current) {
        wrapRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
      }
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const clickable = !!el?.closest('a, button, .proj-card, [role="button"], label, input, textarea, select')
      if (clickable !== hovered.current) {
        hovered.current = clickable
        wrapRef.current?.classList.toggle('hovered', clickable)
      }
    }

    const onDown = () => {
      wrapRef.current?.classList.add('clicked')
      setTimeout(() => wrapRef.current?.classList.remove('clicked'), 160)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
    }
  }, [])

  return (
    <div ref={wrapRef} className="cursor-wrap">
      <span className="cursor-emoji">👆</span>
    </div>
  )
}
