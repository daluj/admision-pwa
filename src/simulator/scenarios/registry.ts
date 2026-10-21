import { SCENARIO_DEFINITIONS, SCENARIO_IDS } from './definitions'
import { createScenario } from './normalDay'
import type { Scenario } from './types'

const SCENARIOS: Record<string, Scenario> = Object.fromEntries(
  SCENARIO_IDS.map((id) => [id, createScenario(id, SCENARIO_DEFINITIONS[id].tuning)]),
)

/** The scenario for a `SimulationState.scenarioId`, or `undefined` when unknown. */
export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS[id]
}
