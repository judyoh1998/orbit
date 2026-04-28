import { useEffect, useRef } from 'react'
import { createOrbAudio, PRESETS, type OrbAudio, type Preset } from './audio'

type Props = {
  x: number
  y: number
  width: number
  height: number
  preset: Preset
}

const ORB_SIZE_PX = 260
const BLUR_PX = 30

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
          `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 1) 0%, rgba(${rgb}, 0.95) 14%, rgba(${rgb}, 0.7) 32%, rgba(${rgb}, 0.4) 52%, rgba(${rgb}, 0.18) 70%, rgba(${rgb}, 0.06) 84%, rgba(0, 0, 0, 0) 95%)`,
        filter: `blur(${BLUR_PX}px) saturate(1.15)`,
        mixBlendMode: 'screen',
        pointerEvents: 'none', // canvas handles all gestures so it can decide pickup vs spawn
        touchAction: 'none',
        willChange: 'transform, left, top',
      }}
    />
  )
}
