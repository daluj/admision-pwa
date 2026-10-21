import { normalDay, NORMAL_DAY_ID } from './normalDay'
import type { Scenario } from './types'

const SCENARIOS: Record<string, Scenario> = { [NORMAL_DAY_ID]: normalDay }

/** The scenario for a `SimulationState.scenarioId`, or `undefined` when unknown. */
export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS[id]
}
