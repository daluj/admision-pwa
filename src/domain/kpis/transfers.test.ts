import { describe, expect, it } from 'vitest'
import { TR_NOW, transfersInput } from '@/test/transfersFixture'
import { computeTransfers, slaStatus, unassignedStatus, type TransfersInput } from './transfers'

const MIN = 60_000
const compute = (extra: Partial<TransfersInput> = {}) =>
  computeTransfers({ ...transfersInput, ...extra })

describe('computeTransfers: KPIs', () => {
  it('counts open transfers by status and the oldest unassigned', () => {
    expect(compute().kpis).toMatchObject({
      open: 4,
      requested: 2,
      assigned: 1,
      pickedUp: 1,
      oldestUnassignedMs: 12 * MIN,
    })
  })

  it('median pickup time and % within SLA only count what was picked up today', () => {
    const { kpis } = compute()
    // today: t4 (10 min, picked up before its SLA ✓), t5 (8 min ✓), t6 (25 min vs 10 ✗), t7 (5 min ✓); t8 was yesterday.
    expect(kpis.pickedUpToday).toBe(4)
    expect(kpis.medianPickupMs).toBe(((8 + 10) / 2) * MIN) // sorted 5, 8, 10, 25 → (8 + 10) / 2
    expect(kpis.withinSlaToday).toBe(3)
    expect(kpis.withinSlaPct).toBeCloseTo(0.75)
    expect(kpis.deliveredToday).toBe(3)
  })

  it('counts porters by status', () => {
    expect(compute().kpis).toMatchObject({ portersAvailable: 2, portersBusy: 2, portersOff: 1 })
  })

  it('has no medians or percentages before anything was picked up', () => {
    const { kpis } = compute({ transfers: transfersInput.transfers.filter((t) => !t.pickedUpAt) })
    expect(kpis).toMatchObject({ medianPickupMs: null, withinSlaPct: null, pickedUpToday: 0 })
  })

  it('uses the Madrid day for "today"', () => {
    const base = transfersInput.transfers.find((t) => t.id === 't5')!
    const at = (iso: string) =>
      compute({ transfers: [{ ...base, requestedAt: iso, pickedUpAt: iso, deliveredAt: iso }] })
        .kpis.pickedUpToday
    expect(at('2026-10-20T21:59:00.000Z')).toBe(0) // 23:59 on the 20th in Madrid
    expect(at('2026-10-20T22:00:00.000Z')).toBe(1) // 00:00 on the 21st
  })
})

describe('computeTransfers: queue', () => {
  it('lists open transfers urgent first, then by SLA', () => {
    const { queue } = compute()
    expect(queue.map((r) => r.transfer.id)).toEqual(['t1', 't3', 't4', 't2'])
  })

  it('describes each row: initials, route, status, porter, SLA and overdue', () => {
    const [t1, t3, t4, t2] = compute().queue
    expect(t1).toMatchObject({
      status: 'REQUESTED',
      priority: 'URGENT',
      fromLabel: 'Urgencias',
      slaMs: -2 * MIN,
      overdue: true,
      waitMs: 12 * MIN,
    })
    expect(t1!.porter).toBeUndefined()
    expect(t1!.initials).toMatch(/^[A-ZÁÉÍÓÚ]\. G\. R\.$/)
    expect(t3).toMatchObject({
      status: 'ASSIGNED',
      slaMs: 3 * MIN,
      overdue: false,
      porter: { id: 'por-c', name: 'Carla Celadora' },
    })
    expect(t4).toMatchObject({ status: 'PICKED_UP', toLabel: 'Radiología', overdue: false }) // already picked up: SLA no longer matters
    expect(t2).toMatchObject({ overdue: false, slaMs: 20 * MIN })
  })

  it('a transfer exactly at its SLA is not overdue yet', () => {
    const base = transfersInput.transfers.find((t) => t.id === 't2')!
    const row = compute({ transfers: [{ ...base, slaDueAt: TR_NOW }] }).queue[0]!
    expect(row).toMatchObject({ slaMs: 0, overdue: false })
  })
})

describe('computeTransfers: porters panel and exceptions', () => {
  it('shows on-duty porters with their current job; available ones first', () => {
    const { porters } = compute()
    expect(porters.map((p) => p.porter.id)).toEqual(['por-a', 'por-b', 'por-c', 'por-d'])
    expect(porters.find((p) => p.porter.id === 'por-c')!.job).toMatchObject({
      transfer: { id: 't3' },
    })
    expect(porters.find((p) => p.porter.id === 'por-d')!.job).toMatchObject({ status: 'PICKED_UP' })
    expect(porters.find((p) => p.porter.id === 'por-a')!.job).toBeUndefined()
  })

  it('flags transfers not picked up past their SLA: critical if urgent, warn otherwise', () => {
    expect(compute().exceptions).toEqual([
      expect.objectContaining({ id: 'sla:t1', severity: 'critical', overdueMs: 2 * MIN }),
    ])
    const normalLate = compute({
      transfers: transfersInput.transfers.map((t) =>
        t.id === 't2'
          ? { ...t, slaDueAt: new Date(Date.parse(TR_NOW) - 5 * MIN).toISOString() }
          : t,
      ),
    }).exceptions
    expect(normalLate.map((e) => `${e.severity}:${e.id}`)).toEqual([
      'critical:sla:t1',
      'warn:sla:t2',
    ])
  })
})

describe('computeTransfers: porter view', () => {
  it('shows my jobs (on the way first), the open queue and what I delivered today', () => {
    const mine = compute({ porterId: 'por-c' }).mine!
    expect(mine.porter.id).toBe('por-c')
    expect(mine.work.map((r) => r.transfer.id)).toEqual(['t3'])
    expect(mine.openQueue.map((r) => r.transfer.id)).toEqual(['t1', 't2'])
    expect(mine.deliveredToday).toBe(0)
    expect(compute({ porterId: 'por-a' }).mine!.deliveredToday).toBe(2) // t5 and t6 today; t8 was yesterday
  })

  it('has no view for an unknown or missing porter', () => {
    expect(compute({ porterId: 'nope' }).mine).toBeUndefined()
    expect(compute({ porterId: null }).mine).toBeUndefined()
    expect(compute().mine).toBeUndefined()
  })
})

describe('tile statuses', () => {
  it.each([
    [null, 'neutral'],
    [1, 'ok'],
    [0.9, 'ok'],
    [0.899, 'warn'],
    [0.75, 'warn'],
    [0.749, 'critical'],
  ])('%s within SLA → %s', (pct, status) => {
    expect(slaStatus(pct)).toBe(status)
  })

  it.each([
    [null, 'neutral'],
    [5 * MIN, 'ok'],
    [5 * MIN + 1, 'warn'],
    [15 * MIN, 'warn'],
    [15 * MIN + 1, 'critical'],
  ])('oldest unassigned %s → %s', (ms, status) => {
    expect(unassignedStatus(ms)).toBe(status)
  })
})
