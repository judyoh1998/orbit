import { useEffect, useRef } from 'react'
import { createOrbAudio, ensureAudioStarted, type OrbAudio } from './audio'

type Props = {
  x: number
  y: number
  width: number
  height: number
  onDrag: (x: number, y: number) => void
}

const ORB_SIZE_PX = 220
const BLUR_PX = 24

export function Orb({ x, y, width, height, onDrag }: Props) {
  const audioRef = useRef<OrbAudio | null>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    const audio = createOrbAudio()
    audioRef.current = audio
    return () => {
      audio.dispose()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || width === 0 || height === 0) return
    const xNorm = x / width
    const yNorm = y / height
    audio.setPan(xNorm * 2 - 1)
    audio.setCutoff01(yNorm)
  }, [x, y, width, height])

  const handlePointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    draggingRef.current = true
    await ensureAudioStarted()
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    onDrag(e.clientX, e.clientY)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        left: x - ORB_SIZE_PX / 2,
        top: y - ORB_SIZE_PX / 2,
        width: ORB_SIZE_PX,
        height: ORB_SIZE_PX,
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 50% 50%, rgba(180,210,255,0.85) 0%, rgba(120,150,220,0.45) 35%, rgba(80,100,180,0.15) 65%, rgba(0,0,0,0) 80%)',
        filter: `blur(${BLUR_PX}px)`,
        pointerEvents: 'auto',
        touchAction: 'none',
        willChange: 'transform, left, top',
      }}
    />
  )
}
