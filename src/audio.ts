import * as Tone from 'tone'

const SMOOTHING_MS = 0.05 // 50ms ramp on parameter changes
const FILTER_MIN_HZ = 200
const FILTER_MAX_HZ = 8000
const ORB_VOLUME_DB = -22 // each orb's noise level; 5 stacked stays comfortable

export type Preset = 'air' | 'dust' | 'static' | 'hush'

type PresetConfig = {
  noise: 'pink' | 'brown' | 'white'
  Q: number
  // r,g,b triplet used by Orb.tsx in its radial gradient; gradient shape is unchanged
  color: string
}

export const PRESETS: Record<Preset, PresetConfig> = {
  air:    { noise: 'pink',  Q: 0.6, color: '180, 215, 255' }, // light blue
  dust:   { noise: 'brown', Q: 2.5, color: '255, 175, 110' }, // warm orange
  static: { noise: 'white', Q: 0.3, color: '200, 160, 240' }, // purple
  hush:   { noise: 'pink',  Q: 6.0, color: '170, 240, 200' }, // mint green
}

const PRESET_NAMES: Preset[] = ['air', 'dust', 'static', 'hush']

export function pickRandomPreset(): Preset {
  return PRESET_NAMES[Math.floor(Math.random() * PRESET_NAMES.length)]
}

export type OrbAudio = {
  setPan: (pan: number) => void
  setCutoff01: (y: number) => void
  dispose: () => void
}

let started = false

export async function ensureAudioStarted(): Promise<void> {
  if (started) return
  await Tone.start()
  started = true
}

// Map y in [0, 1] (top to bottom) to a frequency in [FILTER_MIN_HZ, FILTER_MAX_HZ]
// using a logarithmic curve so motion feels even to the ear.
function yToCutoff(y: number): number {
  const clamped = Math.min(1, Math.max(0, y))
  const minLog = Math.log(FILTER_MIN_HZ)
  const maxLog = Math.log(FILTER_MAX_HZ)
  return Math.exp(minLog + (maxLog - minLog) * clamped)
}

export function createOrbAudio(preset: Preset = 'air'): OrbAudio {
  const cfg = PRESETS[preset]
  const noise = new Tone.Noise({ type: cfg.noise, volume: ORB_VOLUME_DB })
  const filter = new Tone.Filter({
    type: 'lowpass',
    frequency: FILTER_MIN_HZ,
    Q: cfg.Q,
  })
  const panner = new Tone.Panner(0)

  noise.connect(filter)
  filter.connect(panner)
  panner.toDestination()
  noise.start()

  return {
    setPan(pan: number) {
      panner.pan.rampTo(Math.max(-1, Math.min(1, pan)), SMOOTHING_MS)
    },
    setCutoff01(y: number) {
      filter.frequency.rampTo(yToCutoff(y), SMOOTHING_MS)
    },
    dispose() {
      noise.stop()
      noise.dispose()
      filter.dispose()
      panner.dispose()
    },
  }
}
