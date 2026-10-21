import type { Clock, Repositories } from '@/data/ports'
import type { IsoDateTime } from '@/domain/schemas'

export type SimulationClock = Clock & {
  /** Stops following `SimulationState`. */
  dispose: () => void
}

/**
 * The simulated "now": `SimulationState.simNow`, kept in sync through a live subscription so
 * `now()` stays synchronous. Falls back to `fallback` (the wall clock) until the first value or
 * when the demo is not seeded.
 */
export function createSimulationClock(
  repositories: Pick<Repositories, 'simulationState'>,
  fallback: Clock,
): SimulationClock {
  let simNow: IsoDateTime | null = null
  const unsubscribe = repositories.simulationState.observeList().subscribe((rows) => {
    simNow = rows[0]?.simNow ?? null
  })
  return { now: () => simNow ?? fallback.now(), dispose: unsubscribe }
}
