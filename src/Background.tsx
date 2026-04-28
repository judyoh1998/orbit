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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
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
      // Preserve continuity if we already had blobs
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
    let cursorActive = false
    let lastMoveAt = 0

    const onPointerMove = (e: PointerEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      cursorActive = true
      lastMoveAt = performance.now()
    }
    const onPointerLeave = () => {
      cursorActive = false
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('mouseleave', onPointerLeave)

    let raf = 0
    let lastFrame = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000))
      lastFrame = now
      const t = now / 1000

      // Smooth mouse position so velocity isn't jittery between frames.
      smoothMX += (mouseX - smoothMX) * Math.min(1, dt * 18)
      smoothMY += (mouseY - smoothMY) * Math.min(1, dt * 18)

      // Velocity from smoothed samples (px/sec).
      velX = (smoothMX - lastSampleX) / dt
      velY = (smoothMY - lastSampleY) / dt
      lastSampleX = smoothMX
      lastSampleY = smoothMY
      const speed = Math.hypot(velX, velY)

      // Idle decay: if cursor hasn't moved for a beat, drop "active" state.
      if (cursorActive && now - lastMoveAt > 180) cursorActive = false

      // Deep nebula backdrop — slow radial wash that itself drifts.
      const cx = width * 0.5 + Math.sin(t * 0.07) * width * 0.12
      const cy = height * 0.55 + Math.cos(t * 0.05) * height * 0.1
      const grad = ctx.createRadialGradient(
        cx, cy, 0,
        cx, cy, Math.hypot(width, height) * 0.7,
      )
      const baseHue = (240 + Math.sin(t * 0.04) * 30) % 360
      grad.addColorStop(0, `hsl(${baseHue}, 45%, 9%)`)
      grad.addColorStop(0.55, `hsl(${(baseHue + 30) % 360}, 50%, 5%)`)
      grad.addColorStop(1, '#020108')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)

      // Additive blobs — additive blending = soft luminous gas.
      ctx.globalCompositeOperation = 'lighter'

      // The "thick liquid" feel comes from: high damping + strong spring back
      // to the home wander point, plus a cursor repulsion that scales with speed.
      const repelBase = Math.min(width, height) * 0.22
      const repelRadius = repelBase + speed * 0.45

      for (const b of blobs) {
        // Idle wander: each blob orbits its home with a unique lissajous.
        const wx =
          b.hx * width +
          Math.sin(t * b.freqA + b.phaseA) * b.ampA +
          Math.sin(t * b.freqA * 2.3 + b.phaseB) * b.ampA * 0.4
        const wy =
          b.hy * height +
          Math.cos(t * b.freqB + b.phaseB) * b.ampB +
          Math.cos(t * b.freqB * 2.1 + b.phaseA) * b.ampB * 0.4

        // Spring toward wander point.
        const sx = wx - b.x
        const sy = wy - b.y
        b.vx += sx * 6.0 * dt
        b.vy += sy * 6.0 * dt

        // Cursor repulsion — quadratic falloff, plus a wake bias along velocity.
        const dx = b.x - smoothMX
        const dy = b.y - smoothMY
        const dist = Math.hypot(dx, dy)
        if (dist < repelRadius && dist > 0.001) {
          const fall = 1 - dist / repelRadius
          const f2 = fall * fall
          // Static cursor still parts the field a little (like a finger in honey).
          const idleStrength = 320
          const moveStrength = speed * 1.4
          const force = f2 * (idleStrength + moveStrength)
          const nx = dx / dist
          const ny = dy / dist
          b.vx += nx * force * dt
          b.vy += ny * force * dt
          // Wake: push blobs forward in the direction the cursor is heading.
          if (speed > 50) {
            const wakeF = f2 * speed * 0.55
            b.vx += (velX / speed) * wakeF * dt
            b.vy += (velY / speed) * wakeF * dt
          }
        }

        // Heavy viscous damping — this is what makes it feel like syrup.
        const damp = Math.pow(0.06, dt) // ≈ exp(-2.8/sec)
        b.vx *= damp
        b.vy *= damp
        b.x += b.vx * dt
        b.y += b.vy * dt

        // Pulsation — multi-octave so it feels organic, not clock-like.
        const pulse =
          1 +
          b.pulseDepth * Math.sin(t * b.pulseRate + b.pulsePhase) +
          b.pulseDepth * 0.35 * Math.sin(t * b.pulseRate * 2.7 + b.pulsePhase * 1.3)
        const r = b.baseR * pulse

        const hue = (b.hue + Math.sin(t * 0.1 + b.pulsePhase) * b.hueDrift + 360) % 360
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r)
        g.addColorStop(0, `hsla(${hue}, 85%, 62%, ${b.alpha})`)
        g.addColorStop(0.35, `hsla(${(hue + 18) % 360}, 90%, 48%, ${b.alpha * 0.45})`)
        g.addColorStop(0.7, `hsla(${(hue + 32) % 360}, 90%, 30%, ${b.alpha * 0.12})`)
        g.addColorStop(1, `hsla(${hue}, 90%, 20%, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'

      // Subtle vignette to push the eye toward the center & deepen edges.
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
      // Honor reduced-motion: paint a single static frame.
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
      window.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('mouseleave', onPointerLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />
}
