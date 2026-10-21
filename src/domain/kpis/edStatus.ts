import type { EdKpis } from './ed'
import { ED_THRESHOLDS } from './thresholds'
import type { TileStatus } from './censusStatus'

const MINUTE = 60_000

/** Waiting for triage: amber past 15 min, red past 30 min (oldest patient). */
export function triageWaitStatus(oldestMs: number | null): TileStatus {
  if (oldestMs === null) return 'neutral'
  if (oldestMs > ED_THRESHOLDS.triageWaitCriticalMin * MINUTE) return 'critical'
  if (oldestMs > ED_THRESHOLDS.triageWaitWarnMin * MINUTE) return 'warn'
  return 'ok'
}

/** Waiting for a physician: red if an L1/L2 is over target, amber for any other, green otherwise. */
export function physicianWaitStatus(kpis: EdKpis): TileStatus {
  if (kpis.waitingPhysician === 0) return 'neutral'
  if (kpis.overTargetUrgent > 0) return 'critical'
  return kpis.overTarget > 0 ? 'warn' : 'ok'
}

export function boardingCountStatus(count: number): TileStatus {
  if (count > ED_THRESHOLDS.boardingCountCritical) return 'critical'
  if (count > ED_THRESHOLDS.boardingCountWarn) return 'warn'
  return 'neutral'
}

/** Longest boarding: amber from 4 h, red from 8 h (`BOARDING_LONG`). */
export function boardingLongStatus(longestMs: number | null): TileStatus {
  if (longestMs === null) return 'neutral'
  if (longestMs >= ED_THRESHOLDS.boardingLongCriticalMin * MINUTE) return 'critical'
  if (longestMs >= ED_THRESHOLDS.boardingLongWarnMin * MINUTE) return 'warn'
  return 'neutral'
}

export function withinTargetStatus(pct: number | null): TileStatus {
  if (pct === null) return 'neutral'
  if (pct >= ED_THRESHOLDS.withinTargetObjective) return 'ok'
  return pct >= ED_THRESHOLDS.withinTargetWarn ? 'warn' : 'critical'
}
