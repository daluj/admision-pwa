import { describe, expect, it } from 'vitest'
import type { BedStatus } from '@/domain/schemas'
import { bedCounts, type CensusKpis } from './census'
import {
  freeBedsStatus,
  occupancyStatus,
  outliersStatus,
  pendingCleaningStatus,
  turnaroundStatus,
} from './censusStatus'

const kpis = (
  statuses: Partial<Record<BedStatus, number>>,
  extra: Partial<CensusKpis> = {},
): CensusKpis => {
  const beds = Object.entries(statuses).flatMap(([status, n]) =>
    Array.from({ length: n }, () => ({ status }) as { status: BedStatus }),
  )
  return {
    counts: bedCounts(beds as never),
    occupancy: 0,
    inpatients: statuses.OCCUPIED ?? 0,
    outliers: 0,
    outlierUnits: 0,
    expectedToday: 0,
    dischargedToday: 0,
    ...extra,
  }
}

describe('tile statuses', () => {
  it.each([
    [0.85, 'ok'],
    [0.919, 'ok'],
    [0.92, 'warn'],
    [0.969, 'warn'],
    [0.97, 'critical'],
    [1, 'critical'],
  ])('occupancy %f is %s', (occupancy, status) => {
    expect(occupancyStatus(occupancy)).toBe(status)
  })

  it('free beds: ok with some, critical with none, neutral without beds', () => {
    expect(freeBedsStatus(kpis({ AVAILABLE: 2, OCCUPIED: 8 }))).toBe('ok')
    expect(freeBedsStatus(kpis({ OCCUPIED: 10 }))).toBe('critical')
    expect(freeBedsStatus(kpis({}))).toBe('neutral')
  })

  it('pending cleaning warns above 5 % of beds', () => {
    expect(pendingCleaningStatus(kpis({ PENDING_CLEANING: 5, AVAILABLE: 95 }))).toBe('neutral')
    expect(pendingCleaningStatus(kpis({ PENDING_CLEANING: 6, AVAILABLE: 94 }))).toBe('warn')
    expect(pendingCleaningStatus(kpis({}))).toBe('neutral')
  })

  it('outliers warn above 5 % of inpatients', () => {
    expect(outliersStatus(kpis({ OCCUPIED: 100 }, { outliers: 5 }))).toBe('neutral')
    expect(outliersStatus(kpis({ OCCUPIED: 100 }, { outliers: 6 }))).toBe('warn')
    expect(outliersStatus(kpis({}, { outliers: 3 }))).toBe('neutral')
  })

  it.each([
    [null, 'neutral'],
    [0, 'ok'],
    [89 * 60_000, 'ok'],
    [90 * 60_000, 'warn'],
    [149 * 60_000, 'warn'],
    [150 * 60_000, 'critical'],
  ])('turnaround %s ms is %s', (ms, status) => {
    expect(turnaroundStatus(ms)).toBe(status)
  })
})
