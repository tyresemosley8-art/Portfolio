import { useEffect, useRef, useState } from 'react'

export default function Intro({ contentReady }) {
  const firstVisit = !sessionStorage.getItem('intro_seen')
  const [fading, setFading] = useState(false)
  const [gone, setGone] = useState(false)
  const minDoneRef = useRef(false)
  const contentReadyRef = useRef(false)

  // Enforce a minimum 900ms display so the overlay never flickers
  useEffect(() => {
    const t = setTimeout(() => {
      minDoneRef.current = true
      if (contentReadyRef.current) triggerFade()
    }, 900)
    return () => clearTimeout(t)
  }, [])

  // When content is ready, fade if the min time has already elapsed
  useEffect(() => {
    if (!contentReady) return
    contentReadyRef.current = true
    if (minDoneRef.current) triggerFade()
  }, [contentReady])

  function triggerFade() {
    setFading(true)
    setTimeout(() => {
      setGone(true)
      sessionStorage.setItem('intro_seen', '1')
    }, 600)
  }

  if (gone) return null

  return (
    <div className={`intro-overlay${fading ? ' fading' : ''}`}>
      {firstVisit && <span className="intro-name">Tyrese Mosley</span>}
    </div>
  )
}
