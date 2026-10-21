import { describe, expect, it } from 'vitest'
import type { Bed, BedRequest, Unit } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { openBedRequests, suggestBeds, SUGGESTION_COUNT } from './bedRequests'

const NOW = '2026-10-21T10:00:00.000Z'
const ago = (min: number) => new Date(Date.parse(NOW) - min * 60_000).toISOString()

const request = (id: string, extra: Partial<BedRequest>): BedRequest => ({
  ...sampleEntities.bedRequest,
  id,
  admissionId: `a-${id}`,
  requestedAt: ago(30),
  status: 'OPEN',
  ...extra,
})

describe('openBedRequests', () => {
  const patients = [
    { ...sampleEntities.patient, id: 'p1', firstName: 'María', lastName: 'García Ruiz' },
    { ...sampleEntities.patient, id: 'p2', mrn: 'SIM-2', firstName: 'Luis', lastName: 'Pérez Gil' },
  ]
  const admissions = [
    { ...sampleEntities.admission, id: 'a-low', patientId: 'p1', edVisitId: 'v1' },
    {
      ...sampleEntities.admission,
      id: 'a-old',
      patientId: 'p2',
      edVisitId: undefined,
      type: 'SCHEDULED' as const,
    },
    { ...sampleEntities.admission, id: 'a-new', patientId: 'p1', edVisitId: 'v1' },
    { ...sampleEntities.admission, id: 'a-done', patientId: 'p1', edVisitId: 'v1' },
  ]
  const edVisits = [{ ...sampleEntities.edVisit, id: 'v1', triageLevel: 2 as const }]
  const specialties = [{ ...sampleEntities.specialty, code: 'CAR', name: 'Cardiología' }]

  const rows = (requests: BedRequest[]) =>
    openBedRequests({ requests, admissions, patients, edVisits, specialties, now: NOW })

  it('keeps only OPEN requests, urgent first, then longest wait', () => {
    const { open, assignedCount } = rows([
      request('low', { admissionId: 'a-low', priority: 'P3', requestedAt: ago(500) }),
      request('old', { admissionId: 'a-old', priority: 'P1', requestedAt: ago(200) }),
      request('new', { admissionId: 'a-new', priority: 'P1', requestedAt: ago(10) }),
      request('done', { admissionId: 'a-done', status: 'ASSIGNED', assignedBedId: 'b1' }),
      request('gone', { admissionId: 'a-done', status: 'CANCELLED' }),
    ])
    expect(open.map((r) => r.request.id)).toEqual(['old', 'new', 'low'])
    expect(assignedCount).toBe(1)
  })

  it('describes the source, patient initials, specialty name and wait', () => {
    const [old, , low] = rows([
      request('old', { admissionId: 'a-old', priority: 'P1', requestedAt: ago(200) }),
      request('new', { admissionId: 'a-new', priority: 'P1', requestedAt: ago(10) }),
      request('low', { admissionId: 'a-low', priority: 'P3', preferredSpecialtyCode: 'ZZZ' }),
    ]).open
    expect(old).toMatchObject({
      source: { kind: 'SCHEDULED' },
      initials: 'L. P. G.',
      specialtyName: 'Cardiología',
      waitMs: 200 * 60_000,
    })
    expect(low).toMatchObject({ source: { kind: 'ED', triageLevel: 2 }, specialtyName: 'ZZZ' })
  })

  it('skips a request whose admission is missing and never goes negative', () => {
    const { open } = rows([
      request('orphan', { admissionId: 'nope' }),
      request('future', { admissionId: 'a-new', requestedAt: ago(-5) }),
    ])
    expect(open.map((r) => r.request.id)).toEqual(['future'])
    expect(open[0]!.waitMs).toBe(0)
  })
})

describe('suggestBeds', () => {
  const unit = (id: string, extra: Partial<Unit>): Unit => ({
    ...sampleEntities.unit,
    id,
    code: id.toUpperCase(),
    name: id,
    ...extra,
  })
  const units = [
    unit('car', { specialtyCodes: ['CAR'] }),
    unit('min', { specialtyCodes: ['MIN'] }),
    unit('ped', { specialtyCodes: ['PED'] }),
    unit('uci', { type: 'ICU', specialtyCodes: ['MIN'] }),
  ]
  const bed = (id: string, unitId: string, extra: Partial<Bed> = {}): Bed => ({
    ...sampleEntities.bed,
    id,
    unitId,
    label: id,
    status: 'AVAILABLE',
    statusChangedAt: ago(60),
    ...extra,
  })
  const req = (extra: Partial<BedRequest> = {}) => ({
    requiredUnitType: 'WARD' as const,
    preferredSpecialtyCode: 'CAR',
    isolationRequired: false,
    ...extra,
  })
  const ids = (list: { bed: Bed }[]) => list.map((s) => s.bed.id)

  it('ranks same-specialty beds first, then outliers, longest free first', () => {
    const beds = [
      bed('min-1', 'min', { statusChangedAt: ago(500) }),
      bed('car-new', 'car', { statusChangedAt: ago(10) }),
      bed('car-old', 'car', { statusChangedAt: ago(300) }),
    ]
    const { suggestions } = suggestBeds({ request: req(), beds, units })
    expect(ids(suggestions)).toEqual(['car-old', 'car-new', 'min-1'])
    expect(suggestions.map((s) => s.tags)).toEqual([['SPECIALTY'], ['SPECIALTY'], ['OUTLIER']])
  })

  it('ignores beds that are not free and units of another type', () => {
    const beds = [
      bed('car-busy', 'car', { status: 'OCCUPIED' }),
      bed('car-reserved', 'car', { status: 'RESERVED' }),
      bed('car-blocked', 'car', { status: 'BLOCKED' }),
      bed('uci-1', 'uci'),
      bed('car-ok', 'car'),
    ]
    expect(ids(suggestBeds({ request: req(), beds, units }).candidates)).toEqual(['car-ok'])
  })

  it('offers isolation beds only when isolation is required, and tags them', () => {
    const beds = [bed('car-iso', 'car', { isolation: true }), bed('car-plain', 'car')]
    expect(ids(suggestBeds({ request: req(), beds, units }).candidates)).toEqual(['car-plain'])
    const iso = suggestBeds({ request: req({ isolationRequired: true }), beds, units })
    expect(ids(iso.candidates)).toEqual(['car-iso'])
    expect(iso.candidates[0]!.tags).toEqual(['SPECIALTY', 'ISOLATION'])
  })

  it('never uses outlier beds for excluded specialties, in either direction', () => {
    const beds = [bed('min-1', 'min'), bed('ped-1', 'ped')]
    expect(
      suggestBeds({
        request: req({ preferredSpecialtyCode: 'PED' }),
        beds: [bed('min-1', 'min')],
        units,
      }).candidates,
    ).toEqual([])
    expect(
      ids(suggestBeds({ request: req({ preferredSpecialtyCode: 'PED' }), beds, units }).candidates),
    ).toEqual(['ped-1'])
    // A cardiology patient is not placed in the paediatric ward.
    expect(
      ids(suggestBeds({ request: req(), beds: [bed('ped-1', 'ped')], units }).candidates),
    ).toEqual([])
  })

  it('ICU requests ignore specialty', () => {
    const beds = [bed('uci-1', 'uci'), bed('car-1', 'car')]
    const { candidates } = suggestBeds({ request: req({ requiredUnitType: 'ICU' }), beds, units })
    expect(ids(candidates)).toEqual(['uci-1'])
    expect(candidates[0]!.tags).toEqual([])
  })

  it('limits suggestions to the best few and returns every candidate', () => {
    const beds = Array.from({ length: 8 }, (_, i) =>
      bed(`car-${i}`, 'car', { statusChangedAt: ago(100 + i) }),
    )
    const { suggestions, candidates } = suggestBeds({ request: req(), beds, units })
    expect(suggestions).toHaveLength(SUGGESTION_COUNT)
    expect(candidates).toHaveLength(8)
    expect(ids(suggestions)).toEqual(ids(candidates).slice(0, SUGGESTION_COUNT))
  })

  it('returns nothing when no bed fits', () => {
    expect(suggestBeds({ request: req(), beds: [], units })).toEqual({
      suggestions: [],
      candidates: [],
    })
  })
})
