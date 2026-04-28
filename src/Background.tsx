import { useEffect, useRef } from 'react'

type Blob = {
  hx: number
  hy: number
  x: number
  y: number
  vx: number
  vy: number
  baseR: number
  hue: number
  hueDrift: number
  pulseRate: number
  pulseDepth: number
  pulsePhase: number
  freqA: number
  freqB: number
  phaseA: number
  phaseB: number
  ampA: number
  ampB: number
  alpha: number
}

const PALETTE_HUES = [
  208, 220, 232, 252, 268, 282, 300, 322, 350, 18,
]

function makeBlobs(width: number, height: number, count: number): Blob[] {
  const blobs: Blob[] = []
  const minDim = Math.min(width, height)
  for (let i = 0; i < count; i++) {
    const hue = PALETTE_HUES[Math.floor(Math.random() * PALETTE_HUES.length)]
    blobs.push({
      hx: Math.random(),
      hy: Math.random(),
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      baseR: minDim * (0.18 + Math.random() * 0.32),
      hue,
      hueDrift: (Math.random() - 0.5) * 18,
      pulseRate: 0.4 + Math.random() * 1.0,
      pulseDepth: 0.18 + Math.random() * 0.22,
      pulsePhase: Math.random() * Math.PI * 2,
      freqA: 0.07 + Math.random() * 0.18,
      freqB: 0.05 + Math.random() * 0.16,
      phaseA: Math.random() * Math.PI * 2,
      phaseB: Math.random() * Math.PI * 2,
      ampA: minDim * (0.04 + Math.random() * 0.08),
      ampB: minDim * (0.04 + Math.random() * 0.08),
      alpha: 0.45 + Math.random() * 0.35,
    })
  }
  return blobs
}

export function Background() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const photoRef = useRef<HTMLDivElement | null>(null)
  const hazeRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const photo = photoRef.current
    const haze = hazeRef.current
    if (!canvas || !photo || !haze) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = window.innerWidth
    let height = window.innerHeight
    let blobs: Blob[] = []

    const blobCountForSize = (w: number, h: number) => {
      const area = w * h
      if (area < 500_000) return 10
      if (area < 1_400_000) return 14
      return 18
    }

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const next = makeBlobs(width, height, blobCountForSize(width, height))
      if (blobs.length) {
        for (let i = 0; i < Math.min(blobs.length, next.length); i++) {
          next[i].x = blobs[i].x
          next[i].y = blobs[i].y
          next[i].vx = blobs[i].vx
          next[i].vy = blobs[i].vy
        }
      }
      blobs = next
    }
    resize()
    window.addEventListener('resize', resize)

    let mouseX = width / 2
    let mouseY = height / 2
    let smoothMX = mouseX
    let smoothMY = mouseY
    let lastSampleX = mouseX
    let lastSampleY = mouseY
    let velX = 0
    let velY = 0

    const onPointerMove = (e: PointerEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerMove, { passive: true })

    let raf = 0
    let lastFrame = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000))
      lastFrame = now
      const t = now / 1000

      smoothMX += (mouseX - smoothMX) * Math.min(1, dt * 18)
      smoothMY += (mouseY - smoothMY) * Math.min(1, dt * 18)

      velX = (smoothMX - lastSampleX) / dt
      velY = (smoothMY - lastSampleY) / dt
      lastSampleX = smoothMX
      lastSampleY = smoothMY
      const speed = Math.hypot(velX, velY)

      // Photo + haze: ambient drift only — they should never react to the cursor.
      // Only the canvas overlay below parts around the pointer.
      const driftX = Math.sin(t * 0.07) * 18
      const driftY = Math.cos(t * 0.05) * 14
      const breathe = 1.06 + Math.sin(t * 0.13) * 0.015
      photo.style.transform =
        `translate3d(${driftX}px, ${driftY}px, 0) scale(${breathe})`
      const hazeDriftX = Math.sin(t * 0.11 + 1.3) * 22
      const hazeDriftY = Math.cos(t * 0.09 + 0.7) * 18
      const hazeScale = 1.04 + Math.sin(t * 0.17 + 2) * 0.02
      haze.style.transform =
        `translate3d(${hazeDriftX}px, ${hazeDriftY}px, 0) scale(${hazeScale})`

      // Clear canvas (alpha so the photo behind shows through).
      ctx.clearRect(0, 0, width, height)

      ctx.globalCompositeOperation = 'lighter'

      const repelBase = Math.min(width, height) * 0.22
      const repelRadius = repelBase + speed * 0.45

      for (const b of blobs) {
        const wx =
          b.hx * width +
          Math.sin(t * b.freqA + b.phaseA) * b.ampA +
          Math.sin(t * b.freqA * 2.3 + b.phaseB) * b.ampA * 0.4
        const wy =
          b.hy * height +
          Math.cos(t * b.freqB + b.phaseB) * b.ampB +
          Math.cos(t * b.freqB * 2.1 + b.phaseA) * b.ampB * 0.4

        const sx = wx - b.x
        const sy = wy - b.y
        b.vx += sx * 6.0 * dt
        b.vy += sy * 6.0 * dt

        const dx = b.x - smoothMX
        const dy = b.y - smoothMY
        const dist = Math.hypot(dx, dy)
        if (dist < repelRadius && dist > 0.001) {
          const fall = 1 - dist / repelRadius
          const f2 = fall * fall
          const idleStrength = 320
          const moveStrength = speed * 1.4
          const force = f2 * (idleStrength + moveStrength)
          const nx = dx / dist
          const ny = dy / dist
          b.vx += nx * force * dt
          b.vy += ny * force * dt
          if (speed > 50) {
            const wakeF = f2 * speed * 0.55
            b.vx += (velX / speed) * wakeF * dt
            b.vy += (velY / speed) * wakeF * dt
          }
        }

        const damp = Math.pow(0.06, dt)
        b.vx *= damp
        b.vy *= damp
        b.x += b.vx * dt
        b.y += b.vy * dt

        const pulse =
          1 +
          b.pulseDepth * Math.sin(t * b.pulseRate + b.pulsePhase) +
          b.pulseDepth * 0.35 * Math.sin(t * b.pulseRate * 2.7 + b.pulsePhase * 1.3)
        const r = b.baseR * pulse

        const hue = (b.hue + Math.sin(t * 0.1 + b.pulsePhase) * b.hueDrift + 360) % 360
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r)
        g.addColorStop(0, `hsla(${hue}, 85%, 62%, ${b.alpha * 0.7})`)
        g.addColorStop(0.35, `hsla(${(hue + 18) % 360}, 90%, 48%, ${b.alpha * 0.32})`)
        g.addColorStop(0.7, `hsla(${(hue + 32) % 360}, 90%, 30%, ${b.alpha * 0.08})`)
        g.addColorStop(1, `hsla(${hue}, 90%, 20%, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'

      // Soft vignette so edges fall into the dark.
      const vg = ctx.createRadialGradient(
        width * 0.5, height * 0.5, Math.min(width, height) * 0.3,
        width * 0.5, height * 0.5, Math.max(width, height) * 0.75,
      )
      vg.addColorStop(0, 'rgba(0,0,0,0)')
      vg.addColorStop(1, 'rgba(0,0,0,0.55)')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, width, height)

      raf = requestAnimationFrame(tick)
    }

    if (reduced) {
      tick(performance.now())
      cancelAnimationFrame(raf)
    } else {
      raf = requestAnimationFrame(tick)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerMove)
    }
  }, [])

  return (
    <div className="bg" aria-hidden="true">
      <div ref={photoRef} className="bg-photo" />
      <div ref={hazeRef} className="bg-haze" />
      <canvas ref={canvasRef} className="bg-canvas" />
    </div>
  )
}
