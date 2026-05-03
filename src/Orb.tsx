import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createOrbAudio, PRESETS, type OrbAudio, type Preset } from './audio'

type Props = {
  x: number
  y: number
  width: number
  height: number
  preset: Preset
}

const ORB_SIZE_PX = 220
const BLUR_PX = 32

export function Orb({ x, y, width, height, preset }: Props) {
  const audioRef = useRef<OrbAudio | null>(null)

  // Per-orb pulse params, generated once at mount so each orb breathes
  // at its own pace, phase, and stretch axis.
  const [pulse] = useState(() => ({
    tilt: Math.round(Math.random() * 180 - 90),    // deg, sets stretch axis
    duration: 5 + Math.random() * 4,               // 5–9s
    delay: -Math.random() * 9,                     // negative offset = random phase
  }))

  useEffect(() => {
    const audio = createOrbAudio(preset)
    audioRef.current = audio
    return () => {
      audio.dispose()
      audioRef.current = null
    }
  }, [preset])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || width === 0 || height === 0) return
    const xNorm = x / width
    const yNorm = y / height
    audio.setPan(xNorm * 2 - 1)
    audio.setCutoff01(yNorm)
  }, [x, y, width, height])

  const rgb = PRESETS[preset].color

  const style: CSSProperties = {
    position: 'absolute',
    left: x - ORB_SIZE_PX / 2,
    top: y - ORB_SIZE_PX / 2,
    width: ORB_SIZE_PX,
    height: ORB_SIZE_PX,
    borderRadius: '50%',
    background:
      `radial-gradient(circle at 50% 50%, rgba(${rgb}, 1) 0%, rgba(${rgb}, 0.92) 16%, rgba(${rgb}, 0.6) 38%, rgba(${rgb}, 0.28) 58%, rgba(${rgb}, 0.1) 74%, rgba(0, 0, 0, 0) 86%)`,
    filter: `blur(${BLUR_PX}px) saturate(1.25)`,
    mixBlendMode: 'screen', // emit light into the haze instead of sitting on top of it
    pointerEvents: 'none', // canvas handles all gestures so it can decide pickup vs spawn
    touchAction: 'none',
    willChange: 'transform, left, top',
    animationDuration: `${pulse.duration}s`,
    animationDelay: `${pulse.delay}s`,
    ['--orb-tilt' as string]: `${pulse.tilt}deg`,
  }

  return <div className="orb" style={style} />
}
