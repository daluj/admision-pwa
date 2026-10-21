/** Public API of the simulator, for app wiring and feature actions. */
export { generateHospital, type HospitalSnapshot } from './seed/generateHospital'
export { DEFAULT_PROFILE, type HospitalProfile } from './seed/hospital'
export {
  DEFAULT_SEED,
  demoAnchor,
  ensureDemoSeeded,
  MAX_SEED,
  resetDemo,
  type EnsureResult,
} from './seed/seedDemo'
export { createSimulationClock, type SimulationClock } from './clock/simulationClock'
export { getScenario } from './scenarios/registry'
export { normalDay } from './scenarios/normalDay'
export {
  HIGH_PRESSURE_ID,
  isScenarioId,
  NORMAL_DAY_ID,
  SCENARIO_DEFINITIONS,
  SCENARIO_IDS,
  WINTER_FLU_ID,
  type ScenarioId,
} from './scenarios/definitions'
export {
  advanceSimulationTo,
  jumpToTimeOfDay,
  nextTimeOfDay,
  type JumpResult,
  createSimulationRunner,
  runAsLeader,
  runSimulation,
  type SimulationRunner,
} from './runner'
export { readState, stateViolations, type StateSnapshot } from './stateInvariants'
