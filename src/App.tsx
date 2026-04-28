import { useEffect, useState } from 'react'
import { Orb } from './Orb'

type OrbState = {
  x: number
  y: number
}

export function App() {
  const [size, setSize] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }))

  const [orb, setOrb] = useState<OrbState>(() => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  }))

  const [interacted, setInteracted] = useState(false)

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleOrbDrag = (x: number, y: number) => {
    setOrb({ x, y })
    if (!interacted) setInteracted(true)
  }

  return (
    <div className="canvas">
      <Orb
        x={orb.x}
        y={orb.y}
        width={size.w}
        height={size.h}
        onDrag={handleOrbDrag}
      />
      <div className={`hint${interacted ? ' hidden' : ''}`}>drag the orb</div>
    </div>
  )
}
