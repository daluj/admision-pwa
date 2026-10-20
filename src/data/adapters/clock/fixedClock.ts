import type { Clock } from '@/data/ports'
import type { IsoDateTime } from '@/domain/schemas'

export type FixedClock = Clock & {
  set: (now: IsoDateTime) => void
  /** Moves the clock forward by `ms` milliseconds. */
  advance: (ms: number) => void
}

/** Deterministic clock for tests. */
export function createFixedClock(start: IsoDateTime = '2026-10-20T08:00:00.000Z'): FixedClock {
  let current = Date.parse(start)
  return {
    now: () => new Date(current).toISOString(),
    set: (now) => {
      current = Date.parse(now)
    },
    advance: (ms) => {
      current += ms
    },
  }
}
