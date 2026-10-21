import { describe, expect, it } from 'vitest'
import type { HospitalEvent } from '@/domain/schemas'
import { DEFAULT_FILTERS, eventSummary, filterEvents } from './eventLog'

const event = (
  seq: number,
  type: HospitalEvent['type'],
  entityType: HospitalEvent['entityType'],
  occurredAt: string,
  payload: Record<string, unknown> = {},
): HospitalEvent =>
  ({
    seq,
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    type,
    entityType,
    entityId: `entity-${seq}`,
    occurredAt,
    actor: 'simulator',
    payload,
  }) as HospitalEvent

// Newest first, like the store returns them.
const EVENTS = [
  event(4, 'BedBlocked', 'Bed', '2026-10-21T12:00:00.000Z', { reason: 'Avería' }),
  event(3, 'EdPatientTriaged', 'EdVisit', '2026-10-21T11:30:00.000Z', { triageLevel: 3 }),
  event(2, 'BedBlocked', 'Bed', '2026-10-21T08:00:00.000Z', { reason: 'Obras' }),
  event(1, 'SimulationStarted', 'SimulationState', '2026-10-20T10:00:00.000Z'),
]
const NOW = '2026-10-21T12:00:00.000Z'

describe('filterEvents', () => {
  it('returns everything by default', () => {
    expect(filterEvents(EVENTS, DEFAULT_FILTERS, NOW)).toHaveLength(4)
  })

  it('filters by type and by entity', () => {
    expect(
      filterEvents(EVENTS, { ...DEFAULT_FILTERS, type: 'BedBlocked' }, NOW).map((e) => e.seq),
    ).toEqual([4, 2])
    expect(
      filterEvents(EVENTS, { ...DEFAULT_FILTERS, entity: 'EdVisit' }, NOW).map((e) => e.seq),
    ).toEqual([3])
    expect(
      filterEvents(EVENTS, { ...DEFAULT_FILTERS, type: 'BedBlocked', entity: 'EdVisit' }, NOW),
    ).toEqual([])
  })

  it('windows end at the simulated time', () => {
    expect(
      filterEvents(EVENTS, { ...DEFAULT_FILTERS, window: '1h' }, NOW).map((e) => e.seq),
    ).toEqual([4, 3])
    expect(
      filterEvents(EVENTS, { ...DEFAULT_FILTERS, window: '6h' }, NOW).map((e) => e.seq),
    ).toEqual([4, 3, 2])
    expect(
      filterEvents(EVENTS, { ...DEFAULT_FILTERS, window: '24h' }, NOW).map((e) => e.seq),
    ).toEqual([4, 3, 2])
  })

  it('falls back to the newest event when there is no simulated time', () => {
    expect(
      filterEvents(EVENTS, { ...DEFAULT_FILTERS, window: '1h' }, undefined).map((e) => e.seq),
    ).toEqual([4, 3])
  })
})

describe('eventSummary', () => {
  it('uses readable text for known events', () => {
    expect(eventSummary(event(1, 'EdPatientTriaged', 'EdVisit', NOW, { triageLevel: 2 }))).toBe(
      'Nivel 2',
    )
    expect(
      eventSummary(event(1, 'SimulationSpeedChanged', 'SimulationState', NOW, { speed: 300 })),
    ).toBe('300×')
    expect(
      eventSummary(event(1, 'DemoSeeded', 'SimulationState', NOW, { seed: 7, counts: {} })),
    ).toBe('Semilla 7')
  })

  it('lists short primitive fields and skips long ids and objects', () => {
    const summary = eventSummary(
      event(1, 'BedReserved', 'Bed', NOW, {
        bedRequestId: '00000000-0000-4000-8000-000000000001-and-a-very-long-id',
        admissionId: 'adm-1',
      }),
    )
    expect(summary).toBe('admissionId: adm-1')
    expect(eventSummary(event(1, 'BedUnblocked', 'Bed', NOW))).toBe('')
  })
})
