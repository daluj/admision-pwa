import { describe, expect, it } from 'vitest'
import { ENTITY_NAMES, entitySchemas } from '@/domain/schemas'
import { generateHospital, type HospitalSnapshot } from './generateHospital'
import { DEFAULT_PROFILE } from './hospital'

const ANCHOR = '2026-10-20T06:00:00.000Z' // 08:00 Madrid

const snapshots = new Map<number, HospitalSnapshot>(
  [1, 42, 7].map((seed) => [seed, generateHospital({ seed, anchorAt: ANCHOR })]),
)

describe.each([...snapshots])('generateHospital (seed %i) invariants', (_seed, s) => {
  const unitById = new Map(s.unit.map((u) => [u.id, u]))
  const admissionById = new Map(s.admission.map((a) => [a.id, a]))
  const patientIds = new Set(s.patient.map((p) => p.id))

  it('every record passes its schema and ids are unique per entity', () => {
    for (const name of ENTITY_NAMES) {
      const failures = s[name].filter((record) => !entitySchemas[name].safeParse(record).success)
      expect(failures, name).toEqual([])
      expect(new Set(s[name].map((r) => r.id)).size, name).toBe(s[name].length)
    }
  })

  it('occupancy is 83–87 % of operational beds; status mix within targets', () => {
    const operational = s.bed.filter((b) => b.status !== 'BLOCKED').length
    const occupied = s.bed.filter((b) => b.status === 'OCCUPIED').length
    expect(occupied / operational).toBeGreaterThanOrEqual(0.83)
    expect(occupied / operational).toBeLessThanOrEqual(0.87)
    const count = (status: string) => s.bed.filter((b) => b.status === status).length
    expect(count('BLOCKED')).toBe(Math.round(s.bed.length * 0.02))
    expect(count('PENDING_CLEANING')).toBe(Math.round(s.bed.length * 0.02))
    expect(count('CLEANING')).toBe(Math.round(s.bed.length * 0.01))
    expect(count('RESERVED')).toBe(DEFAULT_PROFILE.targets.ed.boardingWithReservedBed)
    for (const bed of s.bed.filter((b) => b.status === 'BLOCKED'))
      expect(bed.blockedReason).toBeTruthy()
  })

  it('critical care runs at ≥ 90 % occupancy', () => {
    for (const unit of s.unit.filter((u) => u.type === 'ICU')) {
      const beds = s.bed.filter((b) => b.unitId === unit.id && b.status !== 'BLOCKED')
      const occupied = beds.filter((b) => b.status === 'OCCUPIED').length
      expect(occupied / beds.length).toBeGreaterThanOrEqual(0.89)
    }
  })

  it('every OCCUPIED bed ↔ exactly one in-house admission with matching bed and patient', () => {
    const inHouse = s.admission.filter(
      (a) => a.status === 'ADMITTED' || a.status === 'DISCHARGE_ORDERED',
    )
    const occupiedBeds = s.bed.filter((b) => b.status === 'OCCUPIED')
    expect(inHouse).toHaveLength(occupiedBeds.length)
    for (const bed of occupiedBeds) {
      const admission = admissionById.get(bed.admissionId!)!
      expect(admission.bedId).toBe(bed.id)
      expect(admission.patientId).toBe(bed.patientId)
      expect(admission.admittedAt! <= ANCHOR).toBe(true)
    }
    for (const bed of s.bed.filter((b) => b.status !== 'OCCUPIED' && b.status !== 'RESERVED')) {
      expect(bed.patientId).toBeUndefined()
      expect(bed.admissionId).toBeUndefined()
    }
  })

  it('no patient is in two places', () => {
    const places = [
      ...s.bed.filter((b) => b.status === 'OCCUPIED').map((b) => b.patientId!),
      ...s.edVisit.map((v) => v.patientId),
      ...s.admission.filter((a) => a.status === 'SCHEDULED').map((a) => a.patientId),
    ]
    expect(new Set(places).size).toBe(places.length)
    for (const id of places) expect(patientIds.has(id)).toBe(true)
    expect(new Set(s.patient.map((p) => p.mrn)).size).toBe(s.patient.length)
  })

  it('RESERVED beds ↔ BED_ASSIGNED admissions + ASSIGNED bed requests', () => {
    for (const bed of s.bed.filter((b) => b.status === 'RESERVED')) {
      const admission = admissionById.get(bed.admissionId!)!
      expect(admission).toMatchObject({
        status: 'BED_ASSIGNED',
        bedId: bed.id,
        patientId: bed.patientId,
      })
      const request = s.bedRequest.find((r) => r.admissionId === admission.id)!
      expect(request).toMatchObject({ status: 'ASSIGNED', assignedBedId: bed.id })
      expect(request.etaAt! > ANCHOR).toBe(true)
    }
  })

  it('every boarding visit has an urgent admission and a bed request', () => {
    const boarding = s.edVisit.filter((v) => v.phase === 'ADMIT_DECISION')
    expect(boarding).toHaveLength(DEFAULT_PROFILE.targets.ed.phases.ADMIT_DECISION)
    for (const visit of boarding) {
      const admission = s.admission.find((a) => a.edVisitId === visit.id)!
      expect(admission).toMatchObject({ type: 'URGENT', patientId: visit.patientId })
      expect(['AWAITING_BED', 'BED_ASSIGNED']).toContain(admission.status)
      expect(s.bedRequest.filter((r) => r.admissionId === admission.id)).toHaveLength(1)
    }
    expect(s.bedRequest).toHaveLength(boarding.length)
  })

  it('ED phase and field consistency, ordered milestones ≤ anchor', () => {
    expect(s.edVisit).toHaveLength(DEFAULT_PROFILE.targets.ed.visits)
    for (const v of s.edVisit) {
      expect(v.triageLevel === undefined).toBe(v.phase === 'ARRIVED')
      expect(v.triagedAt === undefined).toBe(v.phase === 'ARRIVED')
      expect(v.seenAt !== undefined).toBe(
        v.phase === 'IN_ASSESSMENT' || v.phase === 'ADMIT_DECISION',
      )
      expect(v.admitDecisionAt !== undefined).toBe(v.phase === 'ADMIT_DECISION')
      expect(v.outcome).toBeUndefined()
      const milestones = [v.arrivedAt, v.triagedAt, v.seenAt, v.admitDecisionAt].filter(
        Boolean,
      ) as string[]
      expect([...milestones].sort()).toEqual(milestones)
      expect(milestones.every((t) => t <= ANCHOR)).toBe(true)
      expect(Date.parse(ANCHOR) - Date.parse(v.arrivedAt)).toBeLessThanOrEqual(14 * 3600_000)
    }
  })

  it('past timestamps ≤ anchor; future ones only where expected', () => {
    for (const bed of s.bed) expect(bed.statusChangedAt <= ANCHOR).toBe(true)
    for (const r of s.bedRequest) expect(r.requestedAt <= ANCHOR).toBe(true)
    for (const t of s.transferRequest) {
      expect(t.requestedAt <= ANCHOR).toBe(true)
      expect(t.slaDueAt > t.requestedAt).toBe(true)
    }
    for (const a of s.admission) {
      if (a.dischargeOrderedAt) {
        expect(a.dischargeOrderedAt <= ANCHOR).toBe(true)
        expect(a.dischargeOrderedAt >= a.admittedAt!).toBe(true)
      }
      if (a.status === 'SCHEDULED') {
        expect(a.scheduledFor! >= ANCHOR).toBe(true)
        expect(a.scheduledFor! < '2026-10-20T12:30:00.000Z').toBe(true) // before 14:30 Madrid
      }
    }
  })

  it('expected discharges, outliers and scheduled admissions near targets', () => {
    const inHouse = s.admission.filter(
      (a) => a.status === 'ADMITTED' || a.status === 'DISCHARGE_ORDERED',
    )
    const today = inHouse.filter(
      (a) => a.expectedDischargeAt && a.expectedDischargeAt < '2026-10-20T22:00:00.000Z',
    )
    expect(today.length / inHouse.length).toBeGreaterThan(0.2)
    expect(today.length / inHouse.length).toBeLessThan(0.4)
    expect(s.admission.filter((a) => a.status === 'DISCHARGE_ORDERED')).toHaveLength(5)
    const outliers = inHouse.filter((a) => {
      const unit = unitById.get(s.bed.find((b) => b.id === a.bedId)!.unitId)!
      return !unit.specialtyCodes.includes(a.specialtyCode)
    })
    expect(outliers.length / inHouse.length).toBeGreaterThan(0.01)
    expect(outliers.length / inHouse.length).toBeLessThan(0.08)
    expect(s.admission.filter((a) => a.status === 'SCHEDULED')).toHaveLength(15)
    expect(s.transferRequest).toHaveLength(3)
    expect(s.simulationState).toEqual([
      expect.objectContaining({ id: 'current', simNow: ANCHOR, startedAt: ANCHOR, running: false }),
    ])
  })
})

describe('generateHospital determinism and performance', () => {
  it('same seed + anchor ⇒ identical snapshot', () => {
    expect(generateHospital({ seed: 42, anchorAt: ANCHOR })).toEqual(snapshots.get(42))
  })

  it('different seeds ⇒ different hospitals', () => {
    expect(snapshots.get(7)!.patient[0]).not.toEqual(snapshots.get(42)!.patient[0])
  })

  it('anchor + 1 day ⇒ identical except every timestamp shifted by 24 h', () => {
    const nextDay = generateHospital({ seed: 42, anchorAt: '2026-10-21T06:00:00.000Z' })
    const shift = (value: unknown): unknown => {
      if (typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value)) {
        return new Date(Date.parse(value) + 24 * 3600_000).toISOString()
      }
      if (Array.isArray(value)) return value.map(shift)
      if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shift(v)]))
      }
      return value
    }
    const shifted = shift(snapshots.get(42)) as HospitalSnapshot
    // birthYear derives from the anchor year only; same year here.
    expect(nextDay).toEqual(shifted)
  })

  it('generates in under 300 ms', () => {
    const start = performance.now()
    generateHospital({ seed: 99, anchorAt: ANCHOR })
    expect(performance.now() - start).toBeLessThan(300)
  })
})
