import type { Census, Ed } from '@/domain/kpis'
import type { AlertConfig } from './config'

export type StatusLevel = 'NORMAL' | 'ALERT' | 'CRITICAL'

export type StatusReason = {
  kind: 'occupancy' | 'boardingCount' | 'boardingLong'
  level: Exclude<StatusLevel, 'NORMAL'>
  /** Occupancy as a fraction; boarding count; longest boarding in hours. */
  value: number
}

export type HospitalStatus = { level: StatusLevel; reasons: StatusReason[] }

const HOUR = 3_600_000
const RANK: Record<StatusLevel, number> = { NORMAL: 0, ALERT: 1, CRITICAL: 2 }

/**
 * `NORMAL` / `ALERT` / `CRITICAL` from occupancy (≥), boarding count (>) and longest boarding
 * (>); the highest triggered level wins and every trigger is reported.
 */
export function computeStatusLevel(
  census: Pick<Census, 'hospital'>,
  ed: Pick<Ed, 'kpis'>,
  config: AlertConfig,
): HospitalStatus {
  const reasons: StatusReason[] = []
  const occupancy = census.hospital.occupancy
  if (occupancy >= config.occupancyCritical) {
    reasons.push({ kind: 'occupancy', level: 'CRITICAL', value: occupancy })
  } else if (occupancy >= config.occupancyAlert) {
    reasons.push({ kind: 'occupancy', level: 'ALERT', value: occupancy })
  }
  const boarding = ed.kpis.boarding
  if (boarding > config.boardingCountCritical) {
    reasons.push({ kind: 'boardingCount', level: 'CRITICAL', value: boarding })
  } else if (boarding > config.boardingCountAlert) {
    reasons.push({ kind: 'boardingCount', level: 'ALERT', value: boarding })
  }
  const longest = ed.kpis.longestBoardingMs
  if (longest !== null) {
    const hours = longest / HOUR
    if (longest > config.boardingStatusCriticalHours * HOUR) {
      reasons.push({ kind: 'boardingLong', level: 'CRITICAL', value: hours })
    } else if (longest > config.boardingStatusAlertHours * HOUR) {
      reasons.push({ kind: 'boardingLong', level: 'ALERT', value: hours })
    }
  }
  const level = reasons.reduce<StatusLevel>(
    (top, r) => (RANK[r.level] > RANK[top] ? r.level : top),
    'NORMAL',
  )
  return { level, reasons }
}
