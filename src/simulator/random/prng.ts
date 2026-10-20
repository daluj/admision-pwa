/**
 * Seeded pseudo-random numbers (mulberry32). Same seed ⇒ same sequence, on every machine.
 * Never use Math.random() in the simulator.
 */

export type Rng = {
  readonly seed: number
  /** Float in [0, 1). */
  float: () => number
  /** Integer in [min, max] (both inclusive). */
  int: (min: number, max: number) => number
  /** True with probability `p`. */
  chance: (p: number) => boolean
  pick: <T>(items: readonly T[]) => T
  /** Picks a key with probability proportional to its weight. */
  weighted: <K extends string | number>(weights: ReadonlyArray<readonly [K, number]>) => K
  /** Returns a shuffled copy (Fisher–Yates). */
  shuffle: <T>(items: readonly T[]) => T[]
  /** UUID v4-shaped id derived from the stream (deterministic). */
  uuid: () => string
  /**
   * Independent sub-stream derived from the ORIGINAL seed and `label` — not from draws made so
   * far — so adding a draw in one generator never shifts the output of another.
   */
  fork: (label: string) => Rng
}

/** FNV-1a 32-bit hash. */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const float = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number) => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Invalid int range [${min}, ${max}]`)
    }
    return min + Math.floor(float() * (max - min + 1))
  }

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new RangeError('pick() from an empty list')
    return items[int(0, items.length - 1)]!
  }

  const weighted = <K extends string | number>(weights: ReadonlyArray<readonly [K, number]>): K => {
    const total = weights.reduce((sum, [, w]) => sum + w, 0)
    if (!(total > 0)) throw new RangeError('weighted() needs a positive total weight')
    let r = float() * total
    for (const [key, w] of weights) {
      r -= w
      if (r < 0) return key
    }
    return weights[weights.length - 1]![0]
  }

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i)
      ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
    }
    return copy
  }

  const uuid = () => {
    const bytes = Array.from({ length: 16 }, () => int(0, 255))
    bytes[6] = (bytes[6]! & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8]! & 0x3f) | 0x80 // RFC 4122 variant
    const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return {
    seed,
    float,
    int,
    chance: (p) => float() < p,
    pick,
    weighted,
    shuffle,
    uuid,
    fork: (label) => createRng((seed ^ hash(label)) >>> 0),
  }
}
