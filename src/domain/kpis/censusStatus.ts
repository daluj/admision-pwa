import type { CensusKpis } from './census'
import { CENSUS_THRESHOLDS } from './thresholds'

export type TileStatus = 'ok' | 'warn' | 'critical' | 'neutral'

export function occupancyStatus(occupancy: number): TileStatus {
  if (occupancy >= CENSUS_THRESHOLDS.occupancyCritical) return 'critical'
  if (occupancy >= CENSUS_THRESHOLDS.occupancyWarn) return 'warn'
  return 'ok'
}

/** Free beds: fine while there are some, critical when none are left. */
export function freeBedsStatus(kpis: CensusKpis): TileStatus {
  if (kpis.counts.total === 0) return 'neutral'
  return kpis.counts.AVAILABLE > 0 ? 'ok' : 'critical'
}

export function pendingCleaningStatus(kpis: CensusKpis): TileStatus {
  const { total, PENDING_CLEANING } = kpis.counts
  return total > 0 && PENDING_CLEANING / total > CENSUS_THRESHOLDS.pendingCleaningWarnShare
    ? 'warn'
    : 'neutral'
}

export function outliersStatus(kpis: CensusKpis): TileStatus {
  return kpis.inpatients > 0 && kpis.outliers / kpis.inpatients > CENSUS_THRESHOLDS.outlierWarnShare
    ? 'warn'
    : 'neutral'
}
