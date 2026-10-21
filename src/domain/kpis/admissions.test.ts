import { describe, expect, it } from 'vitest'
import { admissionsInput } from '@/test/admissionsFixture'
import { computeAdmissions, scheduleStatus, worklistTab, type AdmissionsInput } from './admissions'
import { balanceStatus, beforeNoonStatus, cancelledNoBedStatus } from './admissionsStatus'

const compute = (extra: Partial<AdmissionsInput> = {}) =>
  computeAdmissions({ ...admissionsInput, ...extra })

describe('computeAdmissions: KPIs', () => {
  it('counts admissions and discharges of the local day', () => {
    expect(compute().kpis).toMatchObject({
      admittedToday: 3, // i1 (urgent), i3 and s5 (scheduled)
      admittedUrgent: 1,
      admittedScheduled: 2,
      scheduledPending: 2, // s1 and s7
      scheduledArrived: 2, // s2 waiting, s3 bed reserved
      expectedToday: 5, // d1, d2, d3, i1, i2
      dischargedToday: 3,
      dischargedBeforeNoon: 2, // d1 (10:00) and d2 (11:30); d3 is exactly 12:00
      cancelledNoBed: 1, // only s4: not the urgent one, not yesterday's
    })
    expect(compute().kpis.pctBeforeNoon).toBeCloseTo(2 / 3)
  })

  it('has no percentage before the first discharge of the day', () => {
    const none = compute({
      admissions: admissionsInput.admissions.filter((a) => a.status !== 'DISCHARGED'),
    })
    expect(none.kpis.dischargedToday).toBe(0)
    expect(none.kpis.pctBeforeNoon).toBeNull()
  })

  it('uses the Madrid day, not the UTC day', () => {
    // 22:00Z on the 20th is 00:00 on the 21st in Madrid; 21:59Z is still the 20th.
    const edge = (iso: string) =>
      compute({
        admissions: [
          {
            ...admissionsInput.admissions.find((a) => a.id === 'd1')!,
            dischargedAt: iso,
            expectedDischargeAt: iso,
          },
        ],
      }).kpis.dischargedToday
    expect(edge('2026-10-20T21:59:00.000Z')).toBe(0)
    expect(edge('2026-10-20T22:00:00.000Z')).toBe(1)
    expect(edge('2026-10-21T21:59:00.000Z')).toBe(1)
    expect(edge('2026-10-21T22:00:00.000Z')).toBe(0)
  })

  it('the 25-hour day when summer time ends still counts one local day', () => {
    const now = '2026-10-25T10:00:00.000Z'
    const base = admissionsInput.admissions.find((a) => a.id === 'd1')!
    const done = (iso: string) =>
      compute({ now, admissions: [{ ...base, dischargedAt: iso, expectedDischargeAt: iso }] }).kpis
        .dischargedToday
    expect(done('2026-10-24T22:00:00.000Z')).toBe(1) // 00:00 Madrid (UTC+2)
    expect(done('2026-10-25T22:59:00.000Z')).toBe(1) // 23:59 Madrid (UTC+1)
    expect(done('2026-10-25T23:00:00.000Z')).toBe(0)
  })
})

describe('computeAdmissions: scheduled admissions', () => {
  it("lists the day's scheduled admissions in time order with their status and cancel reason", () => {
    const rows = compute().scheduled
    expect(rows.map((r) => `${r.admission.id}:${r.status}`)).toEqual([
      's2:ARRIVED',
      's4:CANCELLED',
      's5:ADMITTED',
      's3:BED_RESERVED',
      's1:PENDING',
      's7:PENDING',
    ])
    expect(rows[1]).toMatchObject({ cancelReason: 'NO_BED' })
    expect(rows[0]).toMatchObject({ specialtyName: 'Cardiología', sinceMs: 3.5 * 3_600_000 })
    expect(rows[0]!.initials).toMatch(/^[A-ZÁÉÍÓÚ]\. G\. R\.$/)
  })

  it.each([
    ['SCHEDULED', 'PENDING'],
    ['AWAITING_BED', 'ARRIVED'],
    ['BED_ASSIGNED', 'BED_RESERVED'],
    ['IN_TRANSFER', 'BED_RESERVED'],
    ['ADMITTED', 'ADMITTED'],
    ['DISCHARGE_ORDERED', 'ADMITTED'],
    ['DISCHARGED', 'ADMITTED'],
    ['CANCELLED', 'CANCELLED'],
  ] as const)('%s → %s', (status, expected) => {
    expect(scheduleStatus({ ...admissionsInput.admissions[0]!, status })).toBe(expected)
  })
})

describe('computeAdmissions: bed balance', () => {
  it('available beds + pending discharges − (boarding + scheduled pending)', () => {
    expect(compute().balance).toEqual({
      availableBeds: 3,
      expectedRemaining: 2, // i1 and i2: expected today and still in bed
      boarding: 2,
      scheduledPending: 2,
      value: 1,
    })
  })

  it('does not count a boarder twice once their bed is reserved (that bed is no longer free)', () => {
    const withBed = admissionsInput.admissions.map((a) => ({ ...a }))
    withBed.push({
      ...admissionsInput.admissions.find((a) => a.id === 'i1')!,
      id: 'board-adm',
      status: 'BED_ASSIGNED',
      edVisitId: 'v1',
      bedId: 'b3',
    })
    expect(compute({ admissions: withBed }).balance.boarding).toBe(1) // v1 has its bed; only v2 still needs one
  })

  it('has a unit-level variant for a nurse supervisor (own beds, own specialties)', () => {
    const scope = { unitIds: new Set(['u1']), specialtyCodes: new Set(['CAR']) }
    expect(compute({ scope }).balance).toEqual({
      availableBeds: 2,
      expectedRemaining: 2,
      boarding: 1,
      scheduledPending: 1,
      value: 2,
    })
  })

  it('goes negative when demand outruns beds', () => {
    const busy = compute({
      beds: admissionsInput.beds.map((b) => ({ ...b, status: 'OCCUPIED' as const })),
    })
    expect(busy.balance.value).toBe(0 + 2 - (2 + 2))
  })
})

describe('computeAdmissions: discharges per unit', () => {
  it('breaks expected, done, pending, orders and % before noon down by unit', () => {
    const { byUnit, totals } = compute()
    expect(byUnit.map((u) => u.unit.code)).toEqual(['CAR-5N', 'MIN-6N']) // most pending first
    expect(byUnit[0]).toMatchObject({
      expectedToday: 4,
      doneToday: 2,
      pending: 2,
      ordered: 1,
      doneBeforeNoon: 1,
    })
    expect(byUnit[0]!.pctBeforeNoon).toBeCloseTo(0.5)
    expect(byUnit[1]).toMatchObject({ expectedToday: 1, doneToday: 1, pending: 0, ordered: 0 })
    expect(byUnit[1]!.pctBeforeNoon).toBe(1)
    expect(totals).toMatchObject({
      expectedToday: 5,
      doneToday: 3,
      pending: 2,
      ordered: 1,
      doneBeforeNoon: 2,
    })
    expect(totals!.pctBeforeNoon).toBeCloseTo(2 / 3)
  })

  it('a scoped view only sees its own unit', () => {
    const scope = { unitIds: new Set(['u2']), specialtyCodes: new Set(['MIN']) }
    const { byUnit, kpis, scheduled } = compute({ scope })
    expect(byUnit.map((u) => u.unit.code)).toEqual(['MIN-6N'])
    expect(kpis.dischargedToday).toBe(1)
    expect(scheduled.map((r) => r.admission.id)).toEqual(['s7']) // only MIN
  })
})

describe('computeAdmissions: worklist', () => {
  it('lists inpatients by expected time with tab, stay and overdue flag', () => {
    const { worklist } = compute()
    expect(worklist.map((r) => `${r.admission.id}:${r.tab}`)).toEqual([
      'i5:today', // expected yesterday and still here: overdue, shown with today's
      'i2:ordered',
      'i1:today',
      'i3:upcoming',
      's5:none', // admitted today, no expected discharge yet
      'i4:none',
    ])
    expect(worklist[0]).toMatchObject({ overdue: true })
    expect(worklist[2]).toMatchObject({ overdue: false, ordered: false })
    expect(worklist[2]!.losMs).toBe(4 * 3_600_000)
    expect(worklist[1]).toMatchObject({
      ordered: true,
      unit: { code: 'CAR-5N' },
      bed: { label: 'B2' },
    })
  })

  it('filters by tab', () => {
    const { worklist } = compute()
    expect(worklistTab(worklist, 'today').map((r) => r.admission.id)).toEqual(['i5', 'i1'])
    expect(worklistTab(worklist, 'ordered').map((r) => r.admission.id)).toEqual(['i2'])
    expect(worklistTab(worklist, 'none').map((r) => r.admission.id)).toEqual(['s5', 'i4'])
  })

  it('excludes patients who already left and those without a bed', () => {
    const ids = compute().worklist.map((r) => r.admission.id)
    expect(ids).not.toContain('d1')
    expect(ids).not.toContain('s2')
  })
})

describe('computeAdmissions: exceptions', () => {
  it('flags long-waiting scheduled patients and stuck discharge orders, most severe first', () => {
    const { exceptions } = compute()
    expect(exceptions.map((e) => `${e.severity}:${e.id}`)).toEqual([
      'critical:scheduled:s2', // 3.5 h
      'warn:stuck:i2', // ordered 4 h ago
    ])
  })

  it('exactly 2 h after the scheduled time is not late yet', () => {
    expect(compute().exceptions.some((e) => e.id === 'scheduled:s3')).toBe(false)
  })

  it('raises a balance deficit: warn below 0, critical below −10', () => {
    const deficit = (extraBoarding: number) =>
      compute({
        edVisits: Array.from({ length: extraBoarding }, (_, i) => ({
          ...admissionsInput.edVisits[0]!,
          id: `x${i}`,
        })),
      }).exceptions.find((e) => e.kind === 'balanceDeficit')
    expect(deficit(2)).toBeUndefined() // 3 + 2 − (2 + 2) = 1
    expect(deficit(6)).toMatchObject({ severity: 'warn', value: -3 })
    expect(deficit(14)).toMatchObject({ severity: 'critical', value: -11 })
    expect(deficit(13)).toMatchObject({ severity: 'warn', value: -10 })
  })
})

describe('tile statuses', () => {
  it.each([
    [null, 'neutral'],
    [0.5, 'ok'],
    [0.3, 'ok'],
    [0.299, 'warn'],
    [0.15, 'warn'],
    [0.149, 'critical'],
  ])('%s discharged before noon → %s', (pct, status) => {
    expect(beforeNoonStatus(pct)).toBe(status)
  })

  it.each([
    [5, 'ok'],
    [0, 'ok'],
    [-1, 'warn'],
    [-10, 'warn'],
    [-11, 'critical'],
  ])('balance %i → %s', (value, status) => {
    expect(balanceStatus(value)).toBe(status)
  })

  it('cancellations for lack of a bed warn', () => {
    expect(cancelledNoBedStatus(0)).toBe('neutral')
    expect(cancelledNoBedStatus(1)).toBe('warn')
  })
})
