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
} as const
