import { DEFAULT_PROFILE, type HospitalProfile } from '@/simulator/seed/hospital'
import { NORMAL_TUNING, type ScenarioTuning } from './tuning'

export const NORMAL_DAY_ID = 'normal-day'
export const HIGH_PRESSURE_ID = 'high-pressure'
export const WINTER_FLU_ID = 'winter-flu'

export const SCENARIO_IDS = [NORMAL_DAY_ID, HIGH_PRESSURE_ID, WINTER_FLU_ID] as const
export type ScenarioId = (typeof SCENARIO_IDS)[number]

export type ScenarioDefinition = {
  id: ScenarioId
  /** How the policies behave minute by minute. */
  tuning: ScenarioTuning
  /** The 08:00 snapshot the day starts from (the structure — units, beds — never changes). */
  profile: HospitalProfile
}

/** Same hospital, different starting load. */
const withTargets = (
  targets: Partial<Omit<HospitalProfile['targets'], 'ed'>> & {
    ed?: Partial<HospitalProfile['targets']['ed']>
  },
): HospitalProfile => ({
  ...DEFAULT_PROFILE,
  targets: {
    ...DEFAULT_PROFILE.targets,
    ...targets,
    ed: { ...DEFAULT_PROFILE.targets.ed, ...targets.ed },
  },
})

/**
 * The scenarios, DATA ONLY. "Martes normal" is the reference; "Lunes de alta presión" starts
 * fuller and busier and drains slower; "Pico de gripe" (winter plan) is the extreme: ED packed,
 * wards almost full, everything downstream slower.
 */
export const SCENARIO_DEFINITIONS: Record<ScenarioId, ScenarioDefinition> = {
  [NORMAL_DAY_ID]: { id: NORMAL_DAY_ID, tuning: NORMAL_TUNING, profile: DEFAULT_PROFILE },
  [HIGH_PRESSURE_ID]: {
    id: HIGH_PRESSURE_ID,
    tuning: {
      ...NORMAL_TUNING,
      arrivalsMultiplier: 1.25,
      admitShare: 0.27,
      reserveDelayFactor: 1.4,
      transferDelayFactor: 1.3,
      cleaningDelayFactor: 1.3,
      dischargeDelayFactor: 1.3,
      dischargeSlipShare: 0.5,
      blocksPerDay: 1.5,
    },
    profile: withTargets({
      occupancy: 0.93,
      criticalCareOccupancy: 0.95,
      blockedShare: 0.025,
      pendingCleaningShare: 0.03,
      openTransfers: 5,
      ed: {
        visits: 55,
        phases: { ARRIVED: 9, TRIAGED: 15, IN_ASSESSMENT: 20, ADMIT_DECISION: 11 },
        boardingWithReservedBed: 3,
      },
    }),
  },
  [WINTER_FLU_ID]: {
    id: WINTER_FLU_ID,
    tuning: {
      ...NORMAL_TUNING,
      arrivalsMultiplier: 1.5,
      admitShare: 0.33,
      reserveDelayFactor: 1.8,
      transferDelayFactor: 1.5,
      cleaningDelayFactor: 1.5,
      dischargeDelayFactor: 1.5,
      dischargeSlipShare: 0.6,
      blocksPerDay: 2,
    },
    profile: withTargets({
      occupancy: 0.965,
      criticalCareOccupancy: 0.97,
      blockedShare: 0.03,
      pendingCleaningShare: 0.04,
      dischargeOrdered: 3,
      scheduledAdmissionsToday: 10,
      openTransfers: 6,
      ed: {
        visits: 70,
        phases: { ARRIVED: 12, TRIAGED: 20, IN_ASSESSMENT: 24, ADMIT_DECISION: 14 },
        boardingWithReservedBed: 3,
      },
    }),
  },
}

export const isScenarioId = (value: string): value is ScenarioId =>
  (SCENARIO_IDS as readonly string[]).includes(value)
