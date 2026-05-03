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
  bloom: number
}

type ActiveEvent = {
  update: (dt: number) => void
  draw: (ctx: CanvasRenderingContext2D, mood: number) => void
  alive: () => boolean
}

const PALETTE_HUES = [
  208, 220, 232, 252, 268, 282, 300, 322, 350, 18,
]

const MOOD_AMPLITUDE = 32
const MOOD_PERIOD_MIN = 60
const MOOD_PERIOD_MAX = 90
const EVENT_GAP_MIN = 15
const EVENT_GAP_MAX = 40
const EVENT_FIRST_MIN = 8
const EVENT_FIRST_MAX = 15

const easeInOutCubic = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

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
      bloom: 1,
    })
  }
  return blobs
}

function makeShootingStar(width: number, height: number): ActiveEvent {
  const minDim = Math.min(width, height)
  const margin = minDim * 0.1
  const side = Math.floor(Math.random() * 4)
  let sx: number
  let sy: number
  if (side === 0)      { sx = Math.random() * width; sy = -margin }
  else if (side === 1) { sx = width + margin;        sy = Math.random() * height * 0.75 }
  else if (side === 2) { sx = -margin;               sy = Math.random() * height * 0.75 }
  else                 { sx = Math.random() * width; sy = height + margin }

  const towardCenter = Math.atan2(height * 0.5 - sy, width * 0.5 - sx)
  const angle = towardCenter + (Math.random() - 0.5) * 1.1
  const length = minDim * (0.5 + Math.random() * 0.4)
  const ex = sx + Math.cos(angle) * length
  const ey = sy + Math.sin(angle) * length

  const mxp = (sx + ex) / 2
  const myp = (sy + ey) / 2
  const perpX = -(ey - sy) / length
  const perpY =  (ex - sx) / length
  const arcAmt = (Math.random() - 0.5) * length * 0.32
  const cx = mxp + perpX * arcAmt
  const cy = myp + perpY * arcAmt

  const sweepDur = 2 + Math.random() * 2
  const fadeDur = 1.4
  const baseHue = 200 + Math.random() * 70
  const samples = 28
  const tailLen = 0.28
  let elapsed = 0

  return {
    update(dt) { elapsed += dt },
    draw(ctx, mood) {
      const hue = (baseHue + mood + 360) % 360
      const u = Math.min(1, elapsed / sweepDur)
      const fadeU = elapsed > sweepDur ? Math.min(1, (elapsed - sweepDur) / fadeDur) : 0
      const trailAlpha = 1 - fadeU

      for (let i = 1; i < samples; i++) {
        const tu = u - (i / samples) * tailLen
        if (tu < 0) break
        const omu = 1 - tu
        const ux = omu * omu * sx + 2 * omu * tu * cx + tu * tu * ex
        const uy = omu * omu * sy + 2 * omu * tu * cy + tu * tu * ey
        const fade = (1 - i / samples) * trailAlpha
        const r = 12 * fade + 1.5
        const g = ctx.createRadialGradient(ux, uy, 0, ux, uy, r)
        g.addColorStop(0,   `hsla(${hue}, 90%, 88%, ${0.55 * fade})`)
        g.addColorStop(0.5, `hsla(${hue}, 95%, 65%, ${0.22 * fade})`)
        g.addColorStop(1,   `hsla(${hue}, 95%, 50%, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(ux, uy, r, 0, Math.PI * 2)
        ctx.fill()
      }

      if (elapsed < sweepDur) {
        const omu = 1 - u
        const hx = omu * omu * sx + 2 * omu * u * cx + u * u * ex
        const hy = omu * omu * sy + 2 * omu * u * cy + u * u * ey
        const headR = 22
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, headR)
        g.addColorStop(0,    `hsla(${hue}, 95%, 95%, 0.9)`)
        g.addColorStop(0.35, `hsla(${hue}, 95%, 75%, 0.4)`)
        g.addColorStop(1,    `hsla(${hue}, 95%, 55%, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(hx, hy, headR, 0, Math.PI * 2)
        ctx.fill()
      }
    },
    alive() { return elapsed < sweepDur + fadeDur },
  }
}

function makeBloom(blobs: Blob[]): ActiveEvent | null {
  if (blobs.length === 0) return null
  const order: number[] = []
  for (let i = 0; i < blobs.length; i++) order.push(i)
  order.sort((a, b) => blobs[a].baseR * blobs[a].alpha - blobs[b].baseR * blobs[b].alpha)
  const half = Math.max(1, Math.floor(order.length / 2))
  const picked = blobs[order[Math.floor(Math.random() * half)]]

  const swellDur = 3
  const holdDur = 1
  const releaseDur = 4
  const total = swellDur + holdDur + releaseDur
  const peak = 2.0
  let elapsed = 0

  return {
    update(dt) {
      elapsed += dt
      let m: number
      if (elapsed >= total) {
        m = 1
      } else if (elapsed < swellDur) {
        m = 1 + (peak - 1) * easeInOutCubic(elapsed / swellDur)
      } else if (elapsed < swellDur + holdDur) {
        m = peak
      } else {
        m = peak - (peak - 1) * easeInOutCubic((elapsed - swellDur - holdDur) / releaseDur)
      }
      picked.bloom = m
    },
    draw() {},
    alive() { return elapsed < total },
  }
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
    const events: ActiveEvent[] = []

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
      // Drop any in-flight bloom whose target blob just got replaced.
      events.length = 0
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

    const startTime = performance.now() / 1000
    const moodPhase = Math.random() * Math.PI * 2
    const moodFreq = (Math.PI * 2) /
      (MOOD_PERIOD_MIN + Math.random() * (MOOD_PERIOD_MAX - MOOD_PERIOD_MIN))
    const frozenMood = Math.sin(moodPhase) * MOOD_AMPLITUDE
    let nextEventAt =
      startTime + EVENT_FIRST_MIN + Math.random() * (EVENT_FIRST_MAX - EVENT_FIRST_MIN)

    let raf = 0
    let lastFrame = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000))
      lastFrame = now
      const t = now / 1000

      const mood = reduced
        ? frozenMood
        : Math.sin(t * moodFreq + moodPhase) * MOOD_AMPLITUDE

      if (!reduced && events.length === 0 && t >= nextEventAt) {
        const ev = Math.random() < 0.5
          ? makeShootingStar(width, height)
          : makeBloom(blobs)
        if (ev) events.push(ev)
      }
      for (let i = events.length - 1; i >= 0; i--) {
        events[i].update(dt)
        if (!events[i].alive()) {
          events.splice(i, 1)
          nextEventAt = t + EVENT_GAP_MIN + Math.random() * (EVENT_GAP_MAX - EVENT_GAP_MIN)
        }
      }

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
        const r = b.baseR * pulse * b.bloom
        const a = b.alpha * b.bloom

        const hue = (b.hue + mood + Math.sin(t * 0.1 + b.pulsePhase) * b.hueDrift + 360) % 360
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r)
        g.addColorStop(0, `hsla(${hue}, 85%, 62%, ${a * 0.7})`)
        g.addColorStop(0.35, `hsla(${(hue + 18) % 360}, 90%, 48%, ${a * 0.32})`)
        g.addColorStop(0.7, `hsla(${(hue + 32) % 360}, 90%, 30%, ${a * 0.08})`)
        g.addColorStop(1, `hsla(${hue}, 90%, 20%, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      for (let i = 0; i < events.length; i++) {
        events[i].draw(ctx, mood)
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
