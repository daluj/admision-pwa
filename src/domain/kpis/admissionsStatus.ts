import type { TileStatus } from './censusStatus'
import { ADMISSION_THRESHOLDS } from './thresholds'

/** Share of discharges completed before noon: ok ≥ 30 %, warn ≥ 15 %, critical below. */
export function beforeNoonStatus(pct: number | null): TileStatus {
  if (pct === null) return 'neutral'
  if (pct >= ADMISSION_THRESHOLDS.beforeNoonObjective) return 'ok'
  return pct >= ADMISSION_THRESHOLDS.beforeNoonWarn ? 'warn' : 'critical'
}

/** Bed balance: ok from 0, warn below 0, critical below −10 (`BED_BALANCE_NEGATIVE`). */
export function balanceStatus(value: number): TileStatus {
  if (value < ADMISSION_THRESHOLDS.balanceCritical) return 'critical'
  return value < 0 ? 'warn' : 'ok'
}

export function cancelledNoBedStatus(count: number): TileStatus {
  return count > 0 ? 'warn' : 'neutral'
}
