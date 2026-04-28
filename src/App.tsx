import { useEffect, useRef, useState } from 'react'
import { Orb } from './Orb'
import { ensureAudioStarted, pickRandomPreset, type Preset } from './audio'

const MAX_ORBS = 5
const PICKUP_RADIUS_PX = 90

type OrbState = {
  id: number
  x: number
  y: number
  preset: Preset
}

export function App() {
  const [size, setSize] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }))

  const [orbs, setOrbs] = useState<OrbState[]>([])
  const [interacted, setInteracted] = useState(false)

  const draggingIdRef = useRef<number | null>(null)
  const nextIdRef = useRef(1)

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const findNearestOrbId = (x: number, y: number): number | null => {
    let nearestId: number | null = null
    let nearestDist = PICKUP_RADIUS_PX
    for (const orb of orbs) {
      const d = Math.hypot(orb.x - x, orb.y - y)
      if (d <= nearestDist) {
        nearestDist = d
        nearestId = orb.id
      }
    }
    return nearestId
  }

  const handlePointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const pointerId = e.pointerId
    const x = e.clientX
    const y = e.clientY

    el.setPointerCapture(pointerId)
    await ensureAudioStarted()

    const nearestId = findNearestOrbId(x, y)

    if (nearestId !== null) {
      draggingIdRef.current = nearestId
      setOrbs(prev => prev.map(o => (o.id === nearestId ? { ...o, x, y } : o)))
    } else if (orbs.length < MAX_ORBS) {
      const id = nextIdRef.current++
      const preset = pickRandomPreset()
      draggingIdRef.current = id
      setOrbs(prev => [...prev, { id, x, y, preset }])
    } else {
      draggingIdRef.current = null
    }

    if (!interacted) setInteracted(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const id = draggingIdRef.current
    if (id === null) return
    const x = e.clientX
    const y = e.clientY
    setOrbs(prev => prev.map(o => (o.id === id ? { ...o, x, y } : o)))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingIdRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  return (
    <div
      className="canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {orbs.map(orb => (
        <Orb
          key={orb.id}
          x={orb.x}
          y={orb.y}
          width={size.w}
          height={size.h}
          preset={orb.preset}
        />
      ))}
      <div className={`hint${interacted ? ' hidden' : ''}`}>tap or drag</div>
    </div>
  )
}
