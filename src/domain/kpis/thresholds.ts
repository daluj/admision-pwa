/** Census thresholds (defaults; configurable in Settings from Phase 12). */
export const CENSUS_THRESHOLDS = {
  /** Occupancy ≥ this ⇒ warning (also the hospital ALERT level). */
  occupancyWarn: 0.92,
  /** Occupancy ≥ this ⇒ critical (also the hospital CRITICAL level). */
  occupancyCritical: 0.97,
  /** A bed blocked longer than this is an exception. */
  blockedLongHours: 72,
  /** Pending-cleaning beds above this share of all beds ⇒ warning. */
  pendingCleaningWarnShare: 0.05,
  /** Outlier inpatients above this share of inpatients ⇒ warning. */
  outlierWarnShare: 0.05,
  /** Bed turnaround (median minutes, discharge → cleaned): warn / critical. */
  turnaroundWarnMin: 90,
  turnaroundCriticalMin: 150,
  /** Beds waiting for cleaning: warn / critical (minutes). */
  cleaningLongWarnMin: 60,
  cleaningLongCriticalMin: 120,
  /** Open bed request wait: amber / red (minutes). */
  requestWaitWarnMin: 60,
  requestWaitCriticalMin: 120,
  /** ETA given to a reservation made from the dashboard (minutes). */
  reservationEtaMin: 30,
} as const

/** Specialties whose patients are never placed as outliers (age/sex-specific care), nor their wards used for outliers. */
export const OUTLIER_EXCLUDED_SPECIALTIES: readonly string[] = ['PED', 'GOB', 'PSQ']

/** Emergency Department thresholds (defaults; configurable in Settings from Phase 12). */
export const ED_THRESHOLDS = {
  /** Manchester target, triage → physician, in minutes. */
  physicianTargetMinutes: { 1: 0, 2: 10, 3: 60, 4: 120, 5: 240 },
  /** A triaged patient is "critically late" at this multiple of their target. */
  targetCriticalFactor: 1.5,
  /** Waiting for triage: amber / red when the oldest has waited this long (minutes). */
  triageWaitWarnMin: 15,
  triageWaitCriticalMin: 30,
  /** Boarding count (hospital status level). */
  boardingCountWarn: 10,
  boardingCountCritical: 20,
  /** Boarding time (`BOARDING_LONG` alert rule), in minutes. */
  boardingLongWarnMin: 240,
  boardingLongCriticalMin: 480,
  /** Share of L2–L5 patients seen within target: objective / warning floor. */
  withinTargetObjective: 0.85,
  withinTargetWarn: 0.7,
} as const
