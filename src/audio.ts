import * as Tone from 'tone'

const SMOOTHING_MS = 0.05 // 50ms ramp on parameter changes
const FILTER_MIN_HZ = 200
const FILTER_MAX_HZ = 8000

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

export function createOrbAudio(): OrbAudio {
  const noise = new Tone.Noise({ type: 'pink', volume: -18 })
  const filter = new Tone.Filter({
    type: 'lowpass',
    frequency: FILTER_MIN_HZ,
    Q: 1.2,
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
