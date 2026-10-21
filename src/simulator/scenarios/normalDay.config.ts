import type { Code, TriageLevel } from '@/domain/schemas'
import { DEFAULT_PROFILE } from '@/simulator/seed/hospital'

/**
 * Tunable numbers of the "normal day" scenario. DATA ONLY: change behaviour here, not in the
 * policies. Minutes unless stated. Hours are local (Europe/Madrid).
 */

/** Expected ED arrivals per local hour (index = hour 0–23): ≈ 165 a day, peaks mid-morning and evening. */
export const ARRIVALS_PER_HOUR = [
  3, 2, 2, 2, 2, 3, 4, 6, 8, 10, 11, 11, 11, 10, 9, 9, 9, 10, 10, 9, 8, 6, 5, 4,
] as const

export const TRIAGE_SHARES = Object.entries(DEFAULT_PROFILE.targets.ed.triage).map(
  ([level, share]) => [Number(level) as TriageLevel, share] as const,
)

/** Manchester target, triage → physician (minutes). */
export const PHYSICIAN_TARGET_MINUTES = DEFAULT_PROFILE.targets.ed.physicianTargetMinutes
export const WITHIN_TARGET_SHARE = DEFAULT_PROFILE.targets.ed.withinTargetShare

/** Minutes from arrival to triage, by level. */
export const TRIAGE_DELAY: Record<TriageLevel, readonly [number, number]> = {
  1: [0, 1],
  2: [1, 5],
  3: [5, 30],
  4: [5, 30],
  5: [5, 30],
}

/** Share of L4/L5 patients who leave without being seen. */
export const LWBS_SHARE = 0.05
/** Doctors start at most this many assessments per minute. */
export const MAX_ASSESSMENTS_PER_MINUTE = 3

/** After assessment: share admitted (the rest go home), and minutes until the decision / departure. */
export const ADMIT_SHARE = 0.22
export const ADMIT_DECISION_DELAY = [30, 150] as const
export const HOME_DEPARTURE_DELAY = [45, 300] as const
export const ICU_SHARE_URGENT = 0.12
export const ISOLATION_SHARE = 0.08
export const FALLBACK_SPECIALTY: Code = 'MIN'

/** Bed manager: minutes from request to reservation, by priority; reservations per minute. */
export const RESERVE_DELAY = { P1: [5, 30], P2: [10, 60], P3: [15, 90] } as const
export const MAX_RESERVATIONS_PER_MINUTE = 3
/** Minutes waiting before an outlier bed (other specialty, same unit type) is acceptable. */
export const OUTLIER_AFTER = 180
export const OUTLIER_EXCLUDED_SPECIALTIES = DEFAULT_PROFILE.targets.outlierExcludedSpecialties
export const RESERVATION_ETA = [20, 40] as const

/** Transfers: minutes between steps. */
export const TRANSFER_REQUEST_DELAY = [2, 10] as const
export const TRANSFER_ASSIGN_DELAY = { URGENT: [1, 5], NORMAL: [2, 15] } as const
export const TRANSFER_PICKUP_DELAY = [3, 12] as const
export const TRANSFER_DELIVER_DELAY = [5, 20] as const

/** Scheduled admissions. */
export const SCHEDULED_PER_DAY = DEFAULT_PROFILE.targets.scheduledAdmissionsToday
export const SCHEDULE_CREATED_AT_MINUTE = 7 * 60
export const SCHEDULED_HOURS = [8, 13] as const
export const SCHEDULED_ARRIVAL_DELAY = [0, 20] as const
export const SCHEDULED_CANCEL_AFTER = 180
export const SCHEDULED_SPECIALTIES: ReadonlyArray<readonly [Code, number]> = [
  ['CGD', 4],
  ['TRA', 3],
  ['URO', 2],
  ['GOB', 2],
  ['ONC', 2],
  ['CAR', 1],
  ['NCR', 1],
  ['DIG', 1],
]

/** Discharges. */
export const EXPECTED_SET_SLOT_HOURS = [8, 16] as const
export const EXPECTED_SET_DAILY_SHARE = 0.12
export const EXPECTED_DAYS_AHEAD = [1, 3] as const
export const EXPECTED_HOURS = [10, 18] as const
/** Minutes before the expected discharge that the order is written. */
export const DISCHARGE_ORDER_LEAD = [60, 120] as const
/** Share of expected discharges that slip to the next day instead of happening. */
export const DISCHARGE_SLIP_SHARE = 0.4
export const DISCHARGE_DELAY_AFTER_ORDER = [30, 150] as const
export const ORDER_HOURS = [8, 19] as const
export const DISCHARGE_HOURS = [9, 21] as const
export const MAX_DISCHARGE_ACTIONS_PER_MINUTE = 6

/** Cleaning. */
export const CLEANING_START_DELAY = [5, 40] as const
export const CLEANING_DURATION = [15, 45] as const

/** Blocks: one every ~day on average; unblock slot hours and minimum block time. */
export const BLOCKS_PER_DAY = 1
export const UNBLOCK_HOURS = [8, 20] as const
export const UNBLOCK_MIN_BLOCKED = 120
export const UNBLOCK_DAILY_SHARE = 0.5
