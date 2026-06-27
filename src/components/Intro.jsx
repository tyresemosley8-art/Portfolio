import { useEffect, useState } from 'react'

export default function Intro() {
  const [visible, setVisible] = useState(() => !sessionStorage.getItem('intro_seen'))
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (!visible) return
    const t1 = setTimeout(() => setFading(true), 900)
    const t2 = setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('intro_seen', '1')
    }, 1500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [visible])

  if (!visible) return null

  return (
    <div className={`intro-overlay${fading ? ' fading' : ''}`}>
      <span className="intro-name">Tyrese Mosley</span>
    </div>
  )
}
