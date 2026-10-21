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
