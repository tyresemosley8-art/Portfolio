import { useState, useEffect, useRef } from 'react'

function fmt(s) {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function PlayIcon() {
  return (
    <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
      <polygon points="1,1 12,7 1,13" fill="white" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
      <rect x="1" y="1" width="4" height="12" rx="1.2" fill="white" />
      <rect x="8" y="1" width="4" height="12" rx="1.2" fill="white" />
    </svg>
  )
}
function VolHighIcon() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
      <polygon points="1,4.5 5,4.5 9,1 9,13 5,9.5 1,9.5" fill="white" />
      <path d="M11 3.5c1.2 1 2 2.7 2 4.5s-.8 3.5-2 4.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M13.5 1.5c2 1.6 3.3 4 3.3 5.5 0 1.5-1.3 3.9-3.3 5.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  )
}
function VolLowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polygon points="1,4.5 5,4.5 9,1 9,13 5,9.5 1,9.5" fill="white" />
      <path d="M11 3.5c1.2 1 2 2.7 2 4.5s-.8 3.5-2 4.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  )
}
function MuteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polygon points="1,4.5 5,4.5 9,1 9,13 5,9.5 1,9.5" fill="white" />
      <line x1="11" y1="4" x2="15" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="4" x2="11" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function FSIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ExitFSIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 1v4H1M9 1v4h4M1 9h4v4M13 9H9v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function VideoPlayer({ src }) {
  const videoRef = useRef(null)
  const wrapRef = useRef(null)
  const hideRef = useRef(null)

  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showCtrl, setShowCtrl] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [waiting, setWaiting] = useState(false)

  function scheduleHide() {
    clearTimeout(hideRef.current)
    hideRef.current = setTimeout(() => setShowCtrl(false), 2800)
  }

  function onActivity() {
    setShowCtrl(true)
    if (playing) scheduleHide()
  }

  useEffect(() => () => clearTimeout(hideRef.current), [])

  useEffect(() => {
    if (!playing) { setShowCtrl(true); clearTimeout(hideRef.current) }
    else scheduleHide()
  }, [playing])

  useEffect(() => {
    function onFSChange() { setFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    v.paused ? v.play() : v.pause()
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    const next = !muted
    v.muted = next
    setMuted(next)
    if (!next && volume === 0) { v.volume = 0.7; setVolume(0.7) }
  }

  function handleVolumeChange(e) {
    const v = videoRef.current
    const val = parseFloat(e.target.value)
    if (v) { v.volume = val; v.muted = val === 0 }
    setVolume(val)
    setMuted(val === 0)
  }

  function handleSeek(e) {
    const v = videoRef.current
    if (!v || !v.duration) return
    const val = parseFloat(e.target.value)
    v.currentTime = (val / 100) * v.duration
    setProgress(val)
  }

  function toggleFS() {
    const el = wrapRef.current
    if (!document.fullscreenElement) el?.requestFullscreen()
    else document.exitFullscreen()
  }

  const displayVol = muted ? 0 : volume
  const VolumeIcon = displayVol === 0 ? MuteIcon : displayVol < 0.5 ? VolLowIcon : VolHighIcon

  return (
    <div
      ref={wrapRef}
      className={`vp-wrap${showCtrl ? ' vp-ctrl-visible' : ''}`}
      onMouseMove={onActivity}
      onMouseLeave={() => playing && setShowCtrl(false)}
      onTouchStart={onActivity}
    >
      {waiting && <div className="vp-spinner" />}

      <video
        ref={videoRef}
        src={src}
        className="vp-video"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); if (videoRef.current) videoRef.current.currentTime = 0 }}
        onTimeUpdate={() => {
          const v = videoRef.current
          if (!v) return
          setCurrentTime(v.currentTime)
          setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0)
        }}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onWaiting={() => setWaiting(true)}
        onCanPlay={() => setWaiting(false)}
        preload="metadata"
      />

      <div className="vp-controls" onClick={e => e.stopPropagation()}>
        <input
          type="range" min="0" max="100" step="0.1"
          value={progress}
          onChange={handleSeek}
          className="vp-seek"
          style={{ '--p': `${progress}%` }}
        />
        <div className="vp-bar">
          <button className="vp-btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div className="vp-vol-group">
            <button className="vp-btn" onClick={toggleMute} aria-label="Toggle mute">
              <VolumeIcon />
            </button>
            <input
              type="range" min="0" max="1" step="0.01"
              value={displayVol}
              onChange={handleVolumeChange}
              className="vp-vol"
              style={{ '--p': `${displayVol * 100}%` }}
            />
          </div>

          <span className="vp-time">{fmt(currentTime)} / {fmt(duration)}</span>

          <button className="vp-btn vp-fs" onClick={toggleFS} aria-label="Toggle fullscreen">
            {fullscreen ? <ExitFSIcon /> : <FSIcon />}
          </button>
        </div>
      </div>
    </div>
  )
}
