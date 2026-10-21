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
export { normalDay, NORMAL_DAY_ID } from './scenarios/normalDay'
export {
  advanceSimulationTo,
  createSimulationRunner,
  runAsLeader,
  runSimulation,
  type SimulationRunner,
} from './runner'
export { readState, stateViolations, type StateSnapshot } from './stateInvariants'
