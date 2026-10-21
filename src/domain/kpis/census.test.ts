import { describe, expect, it, vi } from 'vitest'
import type { Admission, Bed, Patient, Unit } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { bedCounts, censusExceptions, computeCensus, occupancyOf } from './census'
import { patientInitials } from './initials'

const NOW = '2026-10-21T10:00:00.000Z' // 12:00 in Madrid
const iso = (hoursFromNow: number) =>
  new Date(Date.parse(NOW) + hoursFromNow * 3_600_000).toISOString()

const ward: Unit = {
  ...sampleEntities.unit,
  id: 'u-ward',
  code: 'CAR-5N',
  name: 'Cardiología 5ª Norte',
  building: 'Edificio Norte',
  floor: 5,
  specialtyCodes: ['CAR'],
}
const icu: Unit = {
  ...sampleEntities.unit,
  id: 'u-icu',
  code: 'UCI',
  name: 'UCI',
  building: 'Edificio Norte',
  floor: 1,
  type: 'ICU',
  specialtyCodes: ['MIN'],
}
const ed: Unit = { ...sampleEntities.unit, id: 'u-ed', code: 'URG', name: 'Urgencias', type: 'ED' }

const bed = (id: string, unitId: string, status: Bed['status'], extra: Partial<Bed> = {}): Bed => ({
  ...sampleEntities.bed,
  id,
  unitId,
  label: id,
  status,
  statusChangedAt: NOW,
  ...extra,
})
const patient = (id: string, firstName: string, lastName: string): Patient => ({
  ...sampleEntities.patient,
  id,
  mrn: `SIM-${id}`,
  firstName,
  lastName,
})
const admission = (id: string, patientId: string, extra: Partial<Admission>): Admission => ({
  ...sampleEntities.admission,
  id,
  patientId,
  edVisitId: undefined,
  specialtyCode: 'CAR',
  status: 'ADMITTED',
  ...extra,
})

const patients = [
  patient('p1', 'María', 'García Ruiz'),
  patient('p2', 'Luis', 'Pérez Gil'),
  patient('p3', 'Ana', 'Sanz Mora'),
  patient('p4', 'Pau', 'Vega Díaz'),
  patient('p5', 'Eva', 'Lara Nieto'),
]
const beds = [
  bed('A1', 'u-ward', 'OCCUPIED', { patientId: 'p1', admissionId: 'a1' }),
  bed('A2', 'u-ward', 'OCCUPIED', { patientId: 'p2', admissionId: 'a2' }),
  bed('A3', 'u-ward', 'AVAILABLE'),
  bed('A4', 'u-ward', 'PENDING_CLEANING'),
  bed('A5', 'u-ward', 'CLEANING'),
  bed('A6', 'u-ward', 'BLOCKED', { blockedReason: 'Avería', statusChangedAt: iso(-96) }),
  bed('A7', 'u-ward', 'RESERVED', { patientId: 'p3', admissionId: 'a3' }),
  bed('I1', 'u-icu', 'OCCUPIED', { patientId: 'p4', admissionId: 'a4' }),
]
const admissions = [
  admission('a1', 'p1', {
    bedId: 'A1',
    admittedAt: iso(-50),
    expectedDischargeAt: iso(2),
  }),
  // Outlier: a medicine patient in the cardiology ward; discharge ordered, expected tomorrow.
  admission('a2', 'p2', {
    bedId: 'A2',
    specialtyCode: 'MIN',
    status: 'DISCHARGE_ORDERED',
    admittedAt: iso(-30),
    expectedDischargeAt: iso(24),
  }),
  admission('a3', 'p3', { bedId: 'A7', status: 'BED_ASSIGNED' }),
  // In the ICU with another specialty: never an outlier.
  admission('a4', 'p4', { bedId: 'I1', specialtyCode: 'CAR', admittedAt: iso(-5) }),
  // Discharged today / yesterday from bed A3 (now free).
  admission('d1', 'p5', {
    bedId: 'A3',
    status: 'DISCHARGED',
    admittedAt: iso(-100),
    expectedDischargeAt: iso(-1),
    dischargedAt: iso(-1),
  }),
  admission('d2', 'p5', {
    bedId: 'A3',
    status: 'DISCHARGED',
    admittedAt: iso(-200),
    expectedDischargeAt: iso(-30),
    dischargedAt: iso(-30),
  }),
]

const census = (input: Partial<Parameters<typeof computeCensus>[0]> = {}) =>
  computeCensus({ beds, units: [ward, icu, ed], admissions, patients, now: NOW, ...input })

describe('bedCounts / occupancy', () => {
  it('counts per status and excludes blocked beds from the operational total', () => {
    const counts = bedCounts(beds)
    expect(counts).toMatchObject({
      OCCUPIED: 3,
      AVAILABLE: 1,
      PENDING_CLEANING: 1,
      CLEANING: 1,
      BLOCKED: 1,
      RESERVED: 1,
      total: 8,
      operational: 7,
    })
    expect(occupancyOf(counts)).toBeCloseTo(3 / 7)
  })

  it('is 0 for no beds and when everything is blocked', () => {
    expect(occupancyOf(bedCounts([]))).toBe(0)
    expect(occupancyOf(bedCounts([bed('X', 'u-ward', 'BLOCKED')]))).toBe(0)
  })
})

describe('computeCensus', () => {
  it('computes hospital KPIs', () => {
    const { hospital } = census()
    expect(hospital.counts.OCCUPIED).toBe(3)
    expect(hospital.inpatients).toBe(3)
    expect(hospital.outliers).toBe(1)
    expect(hospital.outlierUnits).toBe(1)
    // a1 (today), d1 (today, already discharged). a2 is tomorrow, d2 yesterday.
    expect(hospital.expectedToday).toBe(2)
    expect(hospital.dischargedToday).toBe(1)
  })

  it('leaves units without beds out and orders units by building, floor, name', () => {
    const { units } = census()
    expect(units.map((u) => u.unit.code)).toEqual(['UCI', 'CAR-5N'])
  })

  it('splits KPIs per unit', () => {
    const [icuCensus, wardCensus] = census().units
    expect(icuCensus!.kpis.counts.OCCUPIED).toBe(1)
    expect(icuCensus!.kpis.outliers).toBe(0)
    expect(wardCensus!.kpis.counts.OCCUPIED).toBe(2)
    expect(wardCensus!.kpis.outliers).toBe(1)
    expect(wardCensus!.kpis.dischargedToday).toBe(1)
  })

  it('scopes everything to the units it is given', () => {
    const scoped = census({ units: [icu] })
    expect(scoped.units).toHaveLength(1)
    expect(scoped.hospital.counts.total).toBe(1)
    expect(scoped.hospital.expectedToday).toBe(0)
  })

  it('builds bed views with initials, LOS and expected discharge', () => {
    const wardBeds = census().units[1]!.beds
    expect(wardBeds.map((v) => v.bed.label)).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'])
    const a1 = wardBeds[0]!
    expect(a1.patient).toEqual({
      initials: 'M. G. R.',
      fullName: 'María García Ruiz',
      mrn: 'SIM-p1',
    })
    expect(a1.losMs).toBe(50 * 3_600_000)
    expect(a1.expectedDischargeAt).toBe(iso(2))
    expect(a1.dischargeOrdered).toBe(false)
    expect(a1.outlier).toBe(false)

    const a2 = wardBeds[1]!
    expect(a2).toMatchObject({ outlier: true, dischargeOrdered: true, specialtyCode: 'MIN' })

    const reserved = wardBeds[6]!
    expect(reserved.patient?.initials).toBe('A. S. M.')
    expect(reserved.losMs).toBeUndefined()
    expect(wardBeds[2]!.patient).toBeUndefined()
  })
})

describe('expected discharges and the local day', () => {
  const at = (expected: string, now: string) =>
    computeCensus({
      beds: [bed('A1', 'u-ward', 'OCCUPIED', { patientId: 'p1', admissionId: 'a1' })],
      units: [ward],
      admissions: [
        admission('a1', 'p1', { bedId: 'A1', admittedAt: iso(-5), expectedDischargeAt: expected }),
      ],
      patients,
      now,
    }).hospital.expectedToday

  it('uses the Madrid calendar day, not UTC', () => {
    // 2026-10-21 in Madrid (UTC+2) runs from 2026-10-20T22:00Z to 2026-10-21T22:00Z.
    expect(at('2026-10-20T21:59:00.000Z', NOW)).toBe(0)
    expect(at('2026-10-20T22:00:00.000Z', NOW)).toBe(1)
    expect(at('2026-10-21T21:59:00.000Z', NOW)).toBe(1)
    expect(at('2026-10-21T22:00:00.000Z', NOW)).toBe(0)
  })

  it('handles the 25-hour day when summer time ends (2026-10-25)', () => {
    const now = '2026-10-25T10:00:00.000Z'
    expect(at('2026-10-24T22:00:00.000Z', now)).toBe(1) // 00:00 Madrid (UTC+2)
    expect(at('2026-10-25T22:59:00.000Z', now)).toBe(1) // 23:59 Madrid (UTC+1)
    expect(at('2026-10-25T23:00:00.000Z', now)).toBe(0)
  })
})

describe('computeCensus cost', () => {
  it('converts each admission instant to a local date at most once, however many units there are', () => {
    const manyUnits = Array.from({ length: 20 }, (_, i): Unit => ({
      ...ward,
      id: `u${i}`,
      code: `U${i}`,
      name: `U${i}`,
    }))
    const manyBeds = manyUnits.flatMap((u, i) =>
      Array.from({ length: 10 }, (_, j) =>
        bed(`b${i}-${j}`, u.id, 'OCCUPIED', { patientId: 'p1', admissionId: `x${i}-${j}` }),
      ),
    )
    const manyAdmissions = manyBeds.map((b) =>
      admission(b.admissionId!, 'p1', {
        bedId: b.id,
        admittedAt: iso(-10),
        expectedDischargeAt: iso(3),
      }),
    )
    const spy = vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
    computeCensus({
      beds: manyBeds,
      units: manyUnits,
      admissions: manyAdmissions,
      patients,
      now: NOW,
    })
    // One call per admission (+ one for "today"); the old per-unit passes made ~21× as many.
    expect(spy.mock.calls.length).toBeLessThanOrEqual(manyAdmissions.length + 5)
    spy.mockRestore()
  })
})

describe('censusExceptions', () => {
  it('lists full units, blocked > 72 h and outliers: most severe first', () => {
    const exceptions = censusExceptions(census(), NOW)
    // The one-bed ICU is 100 % occupied (critical); then the 4-day-old block; then the outlier.
    expect(exceptions.map((e) => `${e.severity}:${e.kind}`)).toEqual([
      'critical:unitFull',
      'warn:blockedLong',
      'info:outlier',
    ])
    expect(exceptions[0]).toMatchObject({ unitCode: 'UCI' })
    expect(exceptions[1]).toMatchObject({ bedLabel: 'A6', reason: 'Avería' })
    expect(exceptions[2]).toMatchObject({
      initials: 'L. P. G.',
      specialtyCode: 'MIN',
      unitCode: 'CAR-5N',
    })
  })

  it.each([
    [59, false, undefined],
    [61, true, 'warn'],
    [120, true, 'warn'],
    [121, true, 'critical'],
  ])('a bed pending cleaning for %i min → exception %s (%s)', (minutes, raised, severity) => {
    const dirty = [bed('D1', 'u-ward', 'PENDING_CLEANING', { statusChangedAt: iso(-minutes / 60) })]
    const found = censusExceptions(census({ beds: dirty, admissions: [] }), NOW).filter(
      (e) => e.kind === 'cleaningLong',
    )
    expect(found.length).toBe(raised ? 1 : 0)
    if (raised) expect(found[0]).toMatchObject({ severity, bedLabel: 'D1', unitCode: 'CAR-5N' })
  })

  it('a bed being cleaned (not waiting) is not a cleaning exception', () => {
    const cleaning = [bed('C1', 'u-ward', 'CLEANING', { statusChangedAt: iso(-5) })]
    expect(censusExceptions(census({ beds: cleaning, admissions: [] }), NOW)).toEqual([])
  })

  it('orders equally severe exceptions oldest first', () => {
    const blocked = (id: string, hoursAgo: number) =>
      bed(id, 'u-ward', 'BLOCKED', { blockedReason: 'x', statusChangedAt: iso(-hoursAgo) })
    const result = censusExceptions(
      census({ beds: [blocked('B1', 80), blocked('B2', 200), blocked('B3', 100)], admissions: [] }),
      NOW,
    )
    expect(result.map((e) => e.kind === 'blockedLong' && e.bedLabel)).toEqual(['B2', 'B3', 'B1'])
  })

  it('flags unit occupancy at 92 % (warn) and 97 % (critical)', () => {
    const unit = (id: string, occupied: number, total: number) =>
      Array.from({ length: total }, (_, i) =>
        bed(`${id}-${i}`, id, i < occupied ? 'OCCUPIED' : 'AVAILABLE'),
      )
    const warnUnit: Unit = { ...ward, id: 'w', code: 'W', name: 'W' }
    const critUnit: Unit = { ...ward, id: 'c', code: 'C', name: 'C' }
    const okUnit: Unit = { ...ward, id: 'o', code: 'O', name: 'O' }
    const result = censusExceptions(
      computeCensus({
        beds: [...unit('w', 23, 25), ...unit('c', 98, 100), ...unit('o', 22, 25)],
        units: [warnUnit, critUnit, okUnit],
        admissions: [],
        patients: [],
        now: NOW,
      }),
      NOW,
    )
    expect(result.map((e) => [e.kind, e.severity, e.unitCode])).toEqual([
      ['unitFull', 'critical', 'C'],
      ['unitFull', 'warn', 'W'],
    ])
  })

  it('does not flag a bed blocked for less than 72 h', () => {
    const fresh = [
      bed('B1', 'u-ward', 'BLOCKED', { blockedReason: 'x', statusChangedAt: iso(-71) }),
    ]
    expect(censusExceptions(census({ beds: fresh, admissions: [] }), NOW)).toEqual([])
  })
})

describe('patientInitials', () => {
  it.each([
    [{ firstName: 'María José', lastName: 'García Ruiz' }, 'M. G. R.'],
    [{ firstName: 'luis', lastName: 'de la Torre' }, 'L. T.'],
    [{ firstName: 'Ángela', lastName: 'Núñez' }, 'Á. N.'],
  ])('%j → %s', (name, expected) => {
    expect(patientInitials(name)).toBe(expected)
  })
})
