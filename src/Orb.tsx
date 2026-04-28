import { useEffect, useRef } from 'react'
import { createOrbAudio, ensureAudioStarted, type OrbAudio } from './audio'

type Props = {
  x: number
  y: number
  width: number
  height: number
  onDrag: (x: number, y: number) => void
}

const ORB_SIZE_PX = 260
const BLUR_PX = 30

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
          'radial-gradient(circle at 50% 50%, rgba(245,250,255,1) 0%, rgba(220,235,255,0.95) 14%, rgba(180,215,255,0.75) 30%, rgba(140,185,250,0.45) 48%, rgba(100,150,230,0.22) 66%, rgba(70,110,200,0.08) 82%, rgba(0,0,0,0) 95%)',
        filter: `blur(${BLUR_PX}px) saturate(1.1)`,
        mixBlendMode: 'screen',
        pointerEvents: 'auto',
        touchAction: 'none',
        willChange: 'transform, left, top',
      }}
    />
  )
}
