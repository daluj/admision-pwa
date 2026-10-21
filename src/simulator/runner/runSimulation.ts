import type { IsoDateTime } from '@/domain/schemas'
import type { Scenario, SimulationBackend } from '@/simulator/scenarios/types'
import { advanceSimulationTo } from './advance'

/**
 * Headless run: plays `scenario` for `durationMs` of simulated time from the stored `simNow`,
 * with no timers. Used by tests and the determinism check. Returns the new `simNow`.
 */
export async function runSimulation(options: {
  backend: SimulationBackend
  scenario: Scenario
  durationMs: number
}): Promise<IsoDateTime> {
  const { backend, scenario, durationMs } = options
  const state = await backend.repositories.simulationState.get('current')
  if (!state) throw new Error('Seed the demo before running a simulation')
  const target = new Date(Date.parse(state.simNow) + durationMs).toISOString()
  await advanceSimulationTo(backend, scenario, target)
  return target
}
