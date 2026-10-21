import { describe, expect, it } from 'vitest'
import type { HospitalEvent } from '@/domain/schemas'
import { bedTurnaround } from './turnaround'

const NOW = '2026-10-21T10:00:00.000Z' // 12:00 in Madrid
let seq = 0
const at = (iso: string) => iso
const discharge = (bedId: string, occurredAt: string): HospitalEvent =>
  ({
    seq: ++seq,
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    type: 'PatientDischarged',
    occurredAt,
    actor: 'simulator',
    entityType: 'Admission',
    entityId: `adm-${seq}`,
    payload: { bedId },
  }) as HospitalEvent
const cleaned = (bedId: string, occurredAt: string): HospitalEvent =>
  ({
    seq: ++seq,
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    type: 'BedCleaningFinished',
    occurredAt,
    actor: 'simulator',
    entityType: 'Bed',
    entityId: bedId,
    payload: {},
  }) as HospitalEvent
const beds = (...ids: string[]) => new Set(ids)
const compute = (events: HospitalEvent[], ids = beds('b1', 'b2', 'b3', 'b4')) =>
  bedTurnaround({ events, bedIds: ids, now: NOW })

describe('bedTurnaround', () => {
  it('has no value without paired cleanings', () => {
    expect(compute([])).toEqual({ medianMs: null, count: 0 })
    expect(compute([discharge('b1', at('2026-10-21T07:00:00.000Z'))])).toEqual({
      medianMs: null,
      count: 0,
    })
    expect(compute([cleaned('b1', at('2026-10-21T08:00:00.000Z'))])).toEqual({
      medianMs: null,
      count: 0,
    })
  })

  it('measures discharge → cleaned and takes the median (odd count)', () => {
    const events = [
      discharge('b1', '2026-10-21T06:00:00.000Z'),
      cleaned('b1', '2026-10-21T07:00:00.000Z'), // 60 min
      discharge('b2', '2026-10-21T06:00:00.000Z'),
      cleaned('b2', '2026-10-21T08:30:00.000Z'), // 150 min
      discharge('b3', '2026-10-21T06:00:00.000Z'),
      cleaned('b3', '2026-10-21T07:20:00.000Z'), // 80 min
    ]
    expect(compute(events)).toEqual({ medianMs: 80 * 60_000, count: 3 })
  })

  it('averages the two middle values for an even count', () => {
    const events = [
      discharge('b1', '2026-10-21T06:00:00.000Z'),
      cleaned('b1', '2026-10-21T07:00:00.000Z'), // 60
      discharge('b2', '2026-10-21T06:00:00.000Z'),
      cleaned('b2', '2026-10-21T07:40:00.000Z'), // 100
    ]
    expect(compute(events)).toEqual({ medianMs: 80 * 60_000, count: 2 })
  })

  it('is independent of the order the events arrive in', () => {
    const events = [
      discharge('b1', '2026-10-21T06:00:00.000Z'),
      cleaned('b1', '2026-10-21T07:00:00.000Z'),
    ]
    expect(compute([...events].reverse())).toEqual(compute(events))
  })

  it('pairs each cleaning with the latest earlier discharge of the SAME bed', () => {
    const events = [
      discharge('b1', '2026-10-21T05:00:00.000Z'),
      cleaned('b1', '2026-10-21T06:00:00.000Z'), // 60 min
      discharge('b1', '2026-10-21T07:00:00.000Z'),
      discharge('b2', '2026-10-21T07:05:00.000Z'),
      cleaned('b1', '2026-10-21T08:30:00.000Z'), // 90 min, not 210
    ]
    expect(compute(events)).toEqual({ medianMs: 75 * 60_000, count: 2 })
  })

  it('ignores a cleaning that follows no discharge (e.g. after a block) and repeated cleanings', () => {
    const events = [
      discharge('b1', '2026-10-21T06:00:00.000Z'),
      cleaned('b1', '2026-10-21T07:00:00.000Z'),
      cleaned('b1', '2026-10-21T09:00:00.000Z'), // second cleaning, no new discharge
    ]
    expect(compute(events)).toEqual({ medianMs: 60 * 60_000, count: 1 })
  })

  it('counts only beds in scope', () => {
    const events = [
      discharge('b1', '2026-10-21T06:00:00.000Z'),
      cleaned('b1', '2026-10-21T07:00:00.000Z'),
      discharge('b2', '2026-10-21T06:00:00.000Z'),
      cleaned('b2', '2026-10-21T08:00:00.000Z'),
    ]
    expect(compute(events, beds('b2'))).toEqual({ medianMs: 120 * 60_000, count: 1 })
    expect(compute(events, beds())).toEqual({ medianMs: null, count: 0 })
  })

  it('counts cleanings finished on the local day (Madrid), not the UTC day', () => {
    // 2026-10-21 in Madrid runs from 2026-10-20T22:00Z to 2026-10-21T22:00Z.
    const events = [
      discharge('b1', '2026-10-20T21:00:00.000Z'),
      cleaned('b1', '2026-10-20T21:59:00.000Z'), // yesterday (23:59 Madrid)
      discharge('b2', '2026-10-20T21:30:00.000Z'),
      cleaned('b2', '2026-10-20T22:30:00.000Z'), // today (00:30 Madrid): 60 min
    ]
    expect(compute(events)).toEqual({ medianMs: 60 * 60_000, count: 1 })
  })

  it('handles the 25-hour day when summer time ends', () => {
    const now = '2026-10-25T10:00:00.000Z'
    const events = [
      discharge('b1', '2026-10-24T22:10:00.000Z'), // 00:10 Madrid on the 25th
      cleaned('b1', '2026-10-24T23:10:00.000Z'), // 01:10 Madrid (UTC+2): still the 25th
    ]
    expect(bedTurnaround({ events, bedIds: beds('b1'), now })).toEqual({
      medianMs: 60 * 60_000,
      count: 1,
    })
  })
})
