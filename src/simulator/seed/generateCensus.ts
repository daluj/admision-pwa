import type { Admission, Bed, Code, IsoDateTime, Patient, Sex, Unit } from '@/domain/schemas'
import { addMinutes, HOSPITAL_TIME_ZONE, zonedDayAt } from '@/lib/time'
import { personName } from '../random/names'
import type { Rng } from '../random/prng'
import type { HospitalStructure } from './generateStructure'
import type { HospitalProfile } from './hospital'

export type Census = {
  beds: Bed[]
  patients: Patient[]
  admissions: Admission[]
}

const DAY_MINUTES = 24 * 60

export const BLOCK_REASONS = [
  'Avería de la cama',
  'Obras en la habitación',
  'Aislamiento ambiental',
  'Falta de personal de enfermería',
  'Revisión de mantenimiento',
] as const

/** Age range by specialty (years); default adult range skewed older by `oldBias`. */
function ageFor(rng: Rng, specialtyCode: Code): number {
  switch (specialtyCode) {
    case 'PED':
      return rng.int(0, 14)
    case 'GOB':
      return rng.int(18, 45)
    case 'GER':
      return rng.int(75, 98)
    case 'PSQ':
      return rng.int(18, 70)
    default: {
      // Inpatients skew older: max of two draws.
      return Math.max(rng.int(18, 95), rng.int(18, 95))
    }
  }
}

function sexFor(rng: Rng, specialtyCode: Code): Sex {
  if (specialtyCode === 'GOB') return 'F'
  return rng.chance(0.5) ? 'F' : 'M'
}

/**
 * Creates fictitious patients with synthetic NHCs (`SIM-NNNNNN`). `usedMrns` is shared by every
 * factory of one snapshot so NHCs are unique hospital-wide.
 */
export function createPatientFactory(
  rng: Rng,
  ids: Rng,
  anchorAt: IsoDateTime,
  usedMrns: Set<string>,
) {
  const anchorYear = Number(anchorAt.slice(0, 4))
  return (specialtyCode: Code): Patient => {
    const sex = sexFor(rng, specialtyCode)
    const name = personName(rng, sex)
    let mrn: string
    do mrn = `SIM-${String(rng.int(100000, 999999))}`
    while (usedMrns.has(mrn))
    usedMrns.add(mrn)
    return {
      id: ids.uuid(),
      createdAt: anchorAt,
      updatedAt: anchorAt,
      mrn,
      firstName: name.firstName,
      lastName: name.lastName,
      sex,
      birthYear: anchorYear - ageFor(rng, specialtyCode),
    }
  }
}

/** Distributes `total` occupied beds over units: noisy per-unit targets, then exact total. */
function occupiedPerUnit(
  rng: Rng,
  units: Unit[],
  operational: Map<string, Bed[]>,
  profile: HospitalProfile,
): Map<string, number> {
  const result = new Map<string, number>()
  let operationalTotal = 0
  for (const unit of units) {
    const available = operational.get(unit.id)!.length
    operationalTotal += available
    const target =
      unit.type === 'ICU'
        ? profile.targets.criticalCareOccupancy
        : profile.targets.occupancy + (rng.float() - 0.5) * 0.12
    result.set(unit.id, Math.min(available, Math.round(available * target)))
  }
  const wanted = Math.round(operationalTotal * profile.targets.occupancy)
  let current = [...result.values()].reduce((a, b) => a + b, 0)
  const wards = units.filter((u) => u.type === 'WARD')
  // Nudge random wards until the hospital-wide total is exact.
  while (current !== wanted) {
    const unit = rng.pick(wards)
    const n = result.get(unit.id)!
    if (current < wanted && n < operational.get(unit.id)!.length) {
      result.set(unit.id, n + 1)
      current++
    } else if (current > wanted && n > 0) {
      result.set(unit.id, n - 1)
      current--
    }
  }
  return result
}

/** Beds (status mix, occupied), inpatients and their admissions at the anchor. */
export function generateCensus(
  profile: HospitalProfile,
  structure: HospitalStructure,
  rng: Rng,
  anchorAt: IsoDateTime,
  usedMrns: Set<string>,
): Census {
  const r = rng.fork('census')
  const ids = rng.fork('census-ids')
  const newPatient = createPatientFactory(rng.fork('census-people'), ids, anchorAt, usedMrns)
  const { targets } = profile

  const inpatientUnits = structure.units.filter((u) => u.type !== 'ED')
  const beds = structure.beds.map((bed) => ({ ...bed }))
  const bedsByUnit = new Map(
    inpatientUnits.map((u) => [u.id, beds.filter((b) => b.unitId === u.id)]),
  )
  const total = beds.length

  // 1. Blocked beds (wards only).
  const wardBeds = beds.filter(
    (b) => inpatientUnits.find((u) => u.id === b.unitId)!.type === 'WARD',
  )
  for (const bed of r.shuffle(wardBeds).slice(0, Math.round(total * targets.blockedShare))) {
    bed.status = 'BLOCKED'
    bed.blockedReason = r.pick(BLOCK_REASONS)
    bed.statusChangedAt = addMinutes(anchorAt, -r.int(60, 72 * 60))
  }

  // 2. Occupied beds per unit.
  const operational = new Map(
    [...bedsByUnit].map(([unitId, list]) => [unitId, list.filter((b) => b.status !== 'BLOCKED')]),
  )
  const occupied = occupiedPerUnit(r, inpatientUnits, operational, profile)

  const patients: Patient[] = []
  const admissions: Admission[] = []
  const excluded = new Set(targets.outlierExcludedSpecialties)
  const outlierPool = profile.specialties.map((s) => s.code).filter((code) => !excluded.has(code))
  const anchorMs = Date.parse(anchorAt)

  for (const unit of inpatientUnits) {
    const free = r.shuffle(operational.get(unit.id)!)
    for (const bed of free.slice(0, occupied.get(unit.id)!)) {
      // Outliers: adult general wards only, from compatible specialties.
      const candidates = unit.specialtyCodes.some((code) => excluded.has(code))
        ? []
        : outlierPool.filter((code) => !unit.specialtyCodes.includes(code))
      const isOutlier =
        unit.type === 'WARD' && candidates.length > 0 && r.chance(targets.outlierShare)
      const specialtyCode = isOutlier ? r.pick(candidates) : r.pick(unit.specialtyCodes)
      const patient = newPatient(specialtyCode)
      patients.push(patient)

      // LOS: exponential (mean 5 days), capped; at least 1 hour.
      const losMinutes = Math.max(
        60,
        Math.min(
          targets.maxLosDays * DAY_MINUTES,
          Math.round(-Math.log(1 - r.float()) * 5 * DAY_MINUTES),
        ),
      )
      const admittedAt = new Date(anchorMs - losMinutes * 60_000).toISOString()

      let expectedDischargeAt: IsoDateTime | undefined
      const roll = r.float()
      const halfHour = (h0: number, h1: number) => [r.int(h0, h1), r.pick([0, 30])] as const
      if (unit.type === 'ICU' && roll < 0.8) expectedDischargeAt = undefined
      else if (roll < targets.expectedDischargeTodayShare) {
        const [h, m] = halfHour(10, 19)
        expectedDischargeAt = zonedDayAt(anchorAt, HOSPITAL_TIME_ZONE, h, m)
      } else if (
        roll <
        targets.expectedDischargeTodayShare + targets.expectedDischargeTomorrowShare
      ) {
        const [h, m] = halfHour(10, 19)
        expectedDischargeAt = zonedDayAt(
          addMinutes(anchorAt, DAY_MINUTES),
          HOSPITAL_TIME_ZONE,
          h,
          m,
        )
      }

      const admission: Admission = {
        id: ids.uuid(),
        createdAt: anchorAt,
        updatedAt: anchorAt,
        patientId: patient.id,
        type: r.chance(targets.urgentAdmissionShare) ? 'URGENT' : 'SCHEDULED',
        specialtyCode,
        status: 'ADMITTED',
        admittedAt,
        bedId: bed.id,
        ...(expectedDischargeAt ? { expectedDischargeAt } : {}),
      }
      admissions.push(admission)

      bed.status = 'OCCUPIED'
      bed.patientId = patient.id
      bed.admissionId = admission.id
      bed.statusChangedAt = admittedAt
    }
  }

  // 3. Discharge already ordered for some of today's expected discharges.
  const todayEnd = zonedDayAt(addMinutes(anchorAt, DAY_MINUTES), HOSPITAL_TIME_ZONE, 0)
  const dischargingToday = admissions.filter(
    (a) => a.expectedDischargeAt !== undefined && a.expectedDischargeAt < todayEnd,
  )
  for (const admission of r.shuffle(dischargingToday).slice(0, targets.dischargeOrdered)) {
    const earliest = Math.max(Date.parse(admission.admittedAt!), anchorMs - 90 * 60_000)
    admission.status = 'DISCHARGE_ORDERED'
    admission.dischargeOrderedAt = new Date(
      earliest + Math.floor(r.float() * (anchorMs - earliest)),
    ).toISOString()
  }

  // 4. Cleaning states among the remaining free beds.
  const stillFree = r.shuffle(beds.filter((b) => b.status === 'AVAILABLE'))
  const pending = Math.round(total * targets.pendingCleaningShare)
  const cleaning = Math.round(total * targets.cleaningShare)
  stillFree.slice(0, pending).forEach((bed) => {
    bed.status = 'PENDING_CLEANING'
    bed.statusChangedAt = addMinutes(anchorAt, -r.int(10, 90))
  })
  stillFree.slice(pending, pending + cleaning).forEach((bed) => {
    bed.status = 'CLEANING'
    bed.statusChangedAt = addMinutes(anchorAt, -r.int(5, 40))
  })
  stillFree.slice(pending + cleaning).forEach((bed) => {
    bed.statusChangedAt = addMinutes(anchorAt, -r.int(60, 48 * 60))
  })

  return { beds, patients, admissions }
}
