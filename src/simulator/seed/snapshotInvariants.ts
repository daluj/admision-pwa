import { ENTITY_NAMES, entitySchemas, type IsoDateTime } from '@/domain/schemas'
import type { HospitalSnapshot } from './generateHospital'
import type { HospitalProfile } from './hospital'

/**
 * Cross-entity consistency rules every generated snapshot must satisfy. Returns human-readable
 * violations (empty = valid). Used by the per-seed tests and the multi-seed sweep.
 */
export function snapshotViolations(
  s: HospitalSnapshot,
  anchorAt: IsoDateTime,
  profile: HospitalProfile,
  options: { schemas?: boolean } = {},
): string[] {
  const v: string[] = []
  const unitById = new Map(s.unit.map((u) => [u.id, u]))
  const admissionById = new Map(s.admission.map((a) => [a.id, a]))
  const patientById = new Map(s.patient.map((p) => [p.id, p]))
  const bedById = new Map(s.bed.map((b) => [b.id, b]))
  const anchorYear = Number(anchorAt.slice(0, 4))
  const ageOf = (patientId: string) => anchorYear - patientById.get(patientId)!.birthYear

  // Ids and unique fields
  for (const name of ENTITY_NAMES) {
    if (new Set(s[name].map((r) => r.id)).size !== s[name].length) v.push(`duplicate ${name} id`)
    if (options.schemas) {
      for (const record of s[name]) {
        if (!entitySchemas[name].safeParse(record).success) v.push(`invalid ${name} ${record.id}`)
      }
    }
  }
  if (new Set(s.patient.map((p) => p.mrn)).size !== s.patient.length) v.push('duplicate MRN')
  if (new Set(s.user.map((u) => u.username)).size !== s.user.length) v.push('duplicate username')

  // Occupancy
  const operational = s.bed.filter((b) => b.status !== 'BLOCKED').length
  const occupancy = s.bed.filter((b) => b.status === 'OCCUPIED').length / operational
  if (occupancy < 0.83 || occupancy > 0.87) v.push(`occupancy ${occupancy.toFixed(3)}`)

  // Beds ↔ admissions ↔ patients
  for (const bed of s.bed) {
    if (bed.status === 'OCCUPIED' || bed.status === 'RESERVED') {
      const admission = admissionById.get(bed.admissionId ?? '')
      const expected =
        bed.status === 'OCCUPIED' ? ['ADMITTED', 'DISCHARGE_ORDERED'] : ['BED_ASSIGNED']
      if (!admission || !expected.includes(admission.status)) v.push(`bed ${bed.label} admission`)
      else if (admission.bedId !== bed.id || admission.patientId !== bed.patientId) {
        v.push(`bed ${bed.label} ↔ admission mismatch`)
      }
    } else if (bed.patientId || bed.admissionId) v.push(`free bed ${bed.label} has a patient`)
    if (bed.statusChangedAt > anchorAt) v.push(`bed ${bed.label} statusChangedAt in future`)
  }
  for (const a of s.admission) {
    if (!patientById.has(a.patientId)) v.push(`admission ${a.id} unknown patient`)
    if (
      (a.status === 'ADMITTED' || a.status === 'DISCHARGE_ORDERED') &&
      bedById.get(a.bedId ?? '')?.admissionId !== a.id
    ) {
      v.push(`admission ${a.id} bed`)
    }
  }

  // Reserved beds ↔ bed requests, required unit type
  for (const request of s.bedRequest) {
    if (!request.assignedBedId) continue
    const bed = bedById.get(request.assignedBedId)!
    const unit = unitById.get(bed.unitId)!
    if (bed.status !== 'RESERVED') v.push(`assigned bed ${bed.label} not reserved`)
    if (unit.type !== request.requiredUnitType)
      v.push(`request ${request.id} unit type ${unit.type}`)
    if (unit.type === 'WARD' && !unit.specialtyCodes.includes(request.preferredSpecialtyCode)) {
      v.push(`request ${request.id} specialty`)
    }
  }

  // ED: phases, milestone order, Manchester targets for L1/L2
  for (const visit of s.edVisit) {
    const ms = [visit.arrivedAt, visit.triagedAt, visit.seenAt, visit.admitDecisionAt].filter(
      Boolean,
    ) as string[]
    if ([...ms].sort().join() !== ms.join() || ms.some((t) => t > anchorAt)) {
      v.push(`ed ${visit.id} milestones`)
    }
    if ((visit.triageLevel === undefined) !== (visit.phase === 'ARRIVED'))
      v.push(`ed ${visit.id} triage`)
    const level = visit.triageLevel
    if (level !== undefined && level <= 2) {
      const target = profile.targets.ed.physicianTargetMinutes[level]
      const seenOrNow = Date.parse(visit.seenAt ?? anchorAt)
      const wait = (seenOrNow - Date.parse(visit.triagedAt!)) / 60_000
      if (wait > target) v.push(`ed L${level} waited ${wait} min`)
      if (visit.area === 'WAITING_ROOM') v.push(`ed L${level} in waiting room`)
    }
    if (level === 1 && visit.phase === 'TRIAGED') v.push('ed L1 waiting for physician')
    if (
      Date.parse(anchorAt) - Date.parse(visit.arrivedAt) >
      profile.targets.ed.maxHoursInEd * 3600_000
    ) {
      v.push(`ed ${visit.id} too long`)
    }
  }
  for (const visit of s.edVisit.filter((x) => x.phase === 'ADMIT_DECISION')) {
    const admission = s.admission.find((a) => a.edVisitId === visit.id)
    if (!admission || s.bedRequest.filter((r) => r.admissionId === admission.id).length !== 1) {
      v.push(`boarding ${visit.id} without admission/request`)
    }
  }

  // Outliers: age/sex-specific specialties stay in their own wards
  const excluded = new Set(profile.targets.outlierExcludedSpecialties)
  for (const a of s.admission.filter(
    (x) => x.status === 'ADMITTED' || x.status === 'DISCHARGE_ORDERED',
  )) {
    const unit = unitById.get(bedById.get(a.bedId!)!.unitId)!
    if (unit.type === 'WARD' && !unit.specialtyCodes.includes(a.specialtyCode)) {
      if (excluded.has(a.specialtyCode)) v.push(`outlier from ${a.specialtyCode}`)
      if (unit.specialtyCodes.some((code) => excluded.has(code)))
        v.push(`outlier into ${unit.code}`)
    }
    const age = ageOf(a.patientId)
    if (unit.specialtyCodes.includes('PED') && age >= 15) v.push(`adult in ${unit.code}`)
    if (!unit.specialtyCodes.includes('PED') && age < 15) v.push(`child in ${unit.code}`)
  }

  // Transfers only for admitted (not discharging) inpatients
  for (const t of s.transferRequest) {
    const admission = s.admission.find(
      (a) => a.patientId === t.patientId && a.bedId === t.fromLocation.refId,
    )
    if (admission?.status !== 'ADMITTED') v.push(`transfer ${t.id} patient not ADMITTED`)
    if (t.requestedAt > anchorAt || t.slaDueAt <= t.requestedAt) v.push(`transfer ${t.id} times`)
  }
  return v
}
