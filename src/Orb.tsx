import { useEffect, useRef } from 'react'
import { createOrbAudio, PRESETS, type OrbAudio, type Preset } from './audio'

type Props = {
  x: number
  y: number
  width: number
  height: number
  preset: Preset
}

const ORB_SIZE_PX = 220
const BLUR_PX = 24

export function Orb({ x, y, width, height, preset }: Props) {
  const audioRef = useRef<OrbAudio | null>(null)

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

  return (
    <div
      style={{
        position: 'absolute',
        left: x - ORB_SIZE_PX / 2,
        top: y - ORB_SIZE_PX / 2,
        width: ORB_SIZE_PX,
        height: ORB_SIZE_PX,
        borderRadius: '50%',
        background:
          `radial-gradient(circle at 50% 50%, rgba(${rgb}, 0.85) 0%, rgba(${rgb}, 0.45) 35%, rgba(${rgb}, 0.15) 65%, rgba(0, 0, 0, 0) 80%)`,
        filter: `blur(${BLUR_PX}px)`,
        pointerEvents: 'none', // canvas handles all gestures so it can decide pickup vs spawn
        touchAction: 'none',
        willChange: 'transform, left, top',
      }}
    />
  )
}
