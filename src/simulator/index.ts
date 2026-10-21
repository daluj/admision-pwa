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
