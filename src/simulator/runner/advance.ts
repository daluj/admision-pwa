import { ConcurrencyError } from '@/data/ports'
import { advanceSimulation } from '@/domain/commands'
import { SIMULATION_STATE_ID, type IsoDateTime } from '@/domain/schemas'
import type { Scenario, SimulationBackend } from '@/simulator/scenarios/types'
import { MINUTE_MS, minuteIndexOf, minuteIso, processMinute } from './minute'

export class SimulationNotSeededError extends Error {
  constructor() {
    super('There is no SimulationState: seed the demo first')
    this.name = 'SimulationNotSeededError'
  }
}

async function readState(backend: SimulationBackend) {
  const state = await backend.repositories.simulationState.get(SIMULATION_STATE_ID)
  if (!state) throw new SimulationNotSeededError()
  return state
}

const MAX_CLOCK_WRITE_ATTEMPTS = 5

/**
 * Persists `simNow` (state-only change, no event: see `advanceSimulation`). The write carries
 * `expectedLastSeq`: if a control command (pause, speed) committed since we read the state, the
 * write is rejected and retried from fresh state, so it can never undo a pause or speed change.
 */
async function writeSimNow(backend: SimulationBackend, simNow: IsoDateTime): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    const expectedLastSeq = await backend.events.lastSeq()
    const latest = await readState(backend)
    if (Date.parse(simNow) <= Date.parse(latest.simNow)) return
    try {
      await backend.events.append([], [advanceSimulation(latest, simNow)], { expectedLastSeq })
      return
    } catch (error) {
      if (!(error instanceof ConcurrencyError) || attempt >= MAX_CLOCK_WRITE_ATTEMPTS) throw error
    }
  }
}

/**
 * Plays the scenario from the stored `simNow` up to `target`, one whole simulated minute at a
 * time, persisting `simNow` after each minute (and finally at `target`). Randomness depends only
 * on (seed, minute), so the result is the same however the span is split into calls.
 *
 * Minutes already covered by the stored `simNow` are skipped (guards against a rewound clock).
 */
export async function advanceSimulationTo(
  backend: SimulationBackend,
  scenario: Scenario,
  target: IsoDateTime,
  options: { shouldContinue?: () => boolean } = {},
): Promise<void> {
  const { shouldContinue = () => true } = options
  const state = await readState(backend)
  const last = minuteIndexOf(target)

  for (let minute = minuteIndexOf(state.simNow) + 1; minute <= last; minute++) {
    if (!shouldContinue()) return
    const stored = await readState(backend)
    if (minuteIndexOf(stored.simNow) >= minute) continue
    await processMinute(backend, scenario, state.seed, minute)
    await writeSimNow(backend, minuteIso(minute))
  }
  if (shouldContinue()) await writeSimNow(backend, target)
}

export { MINUTE_MS }
