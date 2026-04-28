import * as Tone from 'tone'

const SMOOTHING_MS = 0.05 // 50ms ramp on parameter changes
const FILTER_MIN_HZ = 200
const FILTER_MAX_HZ = 8000
const SYNTH_VOLUME_DB = -22 // each synth orb's noise level; 5 stacked stays comfortable
const SAMPLE_VOLUME_DB = -28 // samples are denser/louder than noise, so trim further
const SAMPLE_LOOP_CROSSFADE_S = 0.5 // fade-in/fade-out applied to each loop iteration
const REVERB_DECAY_S = 4
const REVERB_WET = 0.4

export type Preset = 'air' | 'static' | 'bells' | 'water'

type SynthPreset = {
  kind: 'synth'
  noise: 'pink' | 'brown' | 'white'
  Q: number
  color: string
}

type SamplePreset = {
  kind: 'sample'
  url: string
  Q: number
  color: string
}

type PresetConfig = SynthPreset | SamplePreset

export const PRESETS: Record<Preset, PresetConfig> = {
  air:    { kind: 'synth',  noise: 'pink',  Q: 0.6, color: '180, 215, 255' }, // light blue
  static: { kind: 'synth',  noise: 'white', Q: 0.3, color: '200, 160, 240' }, // purple
  bells:  { kind: 'sample', url: '/bells.mp3', Q: 0.7, color: '220, 200, 255' }, // pale lavender
  water:  { kind: 'sample', url: '/water.mp3', Q: 0.7, color: '100, 200, 220' }, // deep teal
}

const PRESET_NAMES: Preset[] = ['air', 'static', 'bells', 'water']

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

// Single shared reverb: only sample-based presets route through it; synth presets stay dry.
let sharedReverb: Tone.Reverb | null = null
function getSharedReverb(): Tone.Reverb {
  if (!sharedReverb) {
    sharedReverb = new Tone.Reverb({ decay: REVERB_DECAY_S, wet: REVERB_WET }).toDestination()
  }
  return sharedReverb
}

// Map y in [0, 1] (top to bottom) to a frequency in [FILTER_MIN_HZ, FILTER_MAX_HZ]
// using a logarithmic curve so motion feels even to the ear.
function yToCutoff(y: number): number {
  const clamped = Math.min(1, Math.max(0, y))
  const minLog = Math.log(FILTER_MIN_HZ)
  const maxLog = Math.log(FILTER_MAX_HZ)
  return Math.exp(minLog + (maxLog - minLog) * clamped)
}

function createSynthOrb(cfg: SynthPreset): OrbAudio {
  const noise = new Tone.Noise({ type: cfg.noise, volume: SYNTH_VOLUME_DB })
  const filter = new Tone.Filter({ type: 'lowpass', frequency: FILTER_MIN_HZ, Q: cfg.Q })
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

function createSampleOrb(cfg: SamplePreset): OrbAudio {
  let disposed = false
  const player = new Tone.Player({
    url: cfg.url,
    loop: true,
    fadeIn: SAMPLE_LOOP_CROSSFADE_S,
    fadeOut: SAMPLE_LOOP_CROSSFADE_S,
    volume: SAMPLE_VOLUME_DB,
  })
  const filter = new Tone.Filter({ type: 'lowpass', frequency: FILTER_MIN_HZ, Q: cfg.Q })
  const panner = new Tone.Panner(0)

  player.connect(filter)
  filter.connect(panner)
  panner.connect(getSharedReverb())

  // Don't let an orb spawn play a sample that hasn't decoded yet.
  Tone.loaded().then(() => {
    if (disposed) return
    player.start()
  })

  return {
    setPan(pan: number) {
      panner.pan.rampTo(Math.max(-1, Math.min(1, pan)), SMOOTHING_MS)
    },
    setCutoff01(y: number) {
      filter.frequency.rampTo(yToCutoff(y), SMOOTHING_MS)
    },
    dispose() {
      disposed = true
      if (player.state === 'started') player.stop()
      player.dispose()
      filter.dispose()
      panner.dispose()
    },
  }
}

export function createOrbAudio(preset: Preset = 'air'): OrbAudio {
  const cfg = PRESETS[preset]
  return cfg.kind === 'synth' ? createSynthOrb(cfg) : createSampleOrb(cfg)
}
