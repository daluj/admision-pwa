import { CENSUS_THRESHOLDS, ED_THRESHOLDS } from '@/domain/kpis'

/**
 * What the alert engine and the hospital status level read (configurable in Ajustes). Occupancy is
 * a fraction (0.92 = 92 %). Dashboards keep their own default tile thresholds.
 */
export type AlertConfig = {
  /** Hospital status level: occupancy ≥ → ALERT / CRITICAL. */
  occupancyAlert: number
  occupancyCritical: number
  /** Boarding patients > → ALERT / CRITICAL. */
  boardingCountAlert: number
  boardingCountCritical: number
  /** Longest boarding > hours → ALERT / CRITICAL. */
  boardingStatusAlertHours: number
  boardingStatusCriticalHours: number
  /** `BOARDING_LONG` rule: each boarder > hours → WARNING / CRITICAL. */
  boardingLongWarnHours: number
  boardingLongCriticalHours: number
  /** `BED_PENDING_CLEANING_LONG`: a bed pending cleaning > minutes → WARNING / CRITICAL. */
  pendingCleaningWarnMin: number
  pendingCleaningCriticalMin: number
  /** `BED_BALANCE_NEGATIVE`: forecast below 0 is a WARNING, below this CRITICAL. */
  balanceCritical: number
  /** Wall mode: seconds on each dashboard. */
  wallRotationSec: number
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  occupancyAlert: CENSUS_THRESHOLDS.occupancyWarn,
  occupancyCritical: CENSUS_THRESHOLDS.occupancyCritical,
  boardingCountAlert: ED_THRESHOLDS.boardingCountWarn,
  boardingCountCritical: ED_THRESHOLDS.boardingCountCritical,
  boardingStatusAlertHours: 6,
  boardingStatusCriticalHours: 12,
  boardingLongWarnHours: ED_THRESHOLDS.boardingLongWarnMin / 60,
  boardingLongCriticalHours: ED_THRESHOLDS.boardingLongCriticalMin / 60,
  pendingCleaningWarnMin: CENSUS_THRESHOLDS.cleaningLongWarnMin,
  pendingCleaningCriticalMin: CENSUS_THRESHOLDS.cleaningLongCriticalMin,
  balanceCritical: -10,
  wallRotationSec: 20,
}

export type AlertConfigKey = keyof AlertConfig

/** Allowed range of each field (inclusive). */
export const ALERT_CONFIG_RANGES: Record<AlertConfigKey, { min: number; max: number }> = {
  occupancyAlert: { min: 0.5, max: 1 },
  occupancyCritical: { min: 0.5, max: 1 },
  boardingCountAlert: { min: 1, max: 200 },
  boardingCountCritical: { min: 1, max: 200 },
  boardingStatusAlertHours: { min: 1, max: 48 },
  boardingStatusCriticalHours: { min: 1, max: 48 },
  boardingLongWarnHours: { min: 1, max: 48 },
  boardingLongCriticalHours: { min: 1, max: 48 },
  pendingCleaningWarnMin: { min: 5, max: 600 },
  pendingCleaningCriticalMin: { min: 5, max: 600 },
  balanceCritical: { min: -200, max: -1 },
  wallRotationSec: { min: 5, max: 120 },
}

/** The pairs where the first value must be lower than the second ("warn < critical"). */
export const ALERT_CONFIG_ORDER: readonly (readonly [AlertConfigKey, AlertConfigKey])[] = [
  ['occupancyAlert', 'occupancyCritical'],
  ['boardingCountAlert', 'boardingCountCritical'],
  ['boardingStatusAlertHours', 'boardingStatusCriticalHours'],
  ['boardingLongWarnHours', 'boardingLongCriticalHours'],
  ['pendingCleaningWarnMin', 'pendingCleaningCriticalMin'],
]

export type AlertConfigErrors = Partial<Record<AlertConfigKey, 'range' | 'order'>>

/** Field-level problems of a candidate config; empty = valid. */
export function validateAlertConfig(config: AlertConfig): AlertConfigErrors {
  const errors: AlertConfigErrors = {}
  for (const key of Object.keys(ALERT_CONFIG_RANGES) as AlertConfigKey[]) {
    const { min, max } = ALERT_CONFIG_RANGES[key]
    const value = config[key]
    if (!Number.isFinite(value) || value < min || value > max) errors[key] = 'range'
  }
  for (const [low, high] of ALERT_CONFIG_ORDER) {
    if (!errors[low] && !errors[high] && config[low] >= config[high]) errors[high] = 'order'
  }
  return errors
}

/** Reads a stored value defensively: unknown or invalid fields fall back to the defaults. */
export function parseAlertConfig(raw: unknown): AlertConfig {
  const merged: AlertConfig = { ...DEFAULT_ALERT_CONFIG }
  if (typeof raw === 'object' && raw !== null) {
    for (const key of Object.keys(DEFAULT_ALERT_CONFIG) as AlertConfigKey[]) {
      const value = (raw as Record<string, unknown>)[key]
      if (typeof value === 'number' && Number.isFinite(value)) merged[key] = value
    }
  }
  // A stored config that no longer validates is ignored as a whole: half a config is worse.
  return Object.keys(validateAlertConfig(merged)).length === 0
    ? merged
    : { ...DEFAULT_ALERT_CONFIG }
}
