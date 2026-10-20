import type {
  Admission,
  Bed,
  BedRequest,
  BedRequestPriority,
  Code,
  EdArea,
  EdVisit,
  IsoDateTime,
  Patient,
  TransferRequest,
  TriageLevel,
} from '@/domain/schemas'
import { addMinutes, HOSPITAL_TIME_ZONE, zonedDayAt } from '@/lib/time'
import type { Rng } from '../random/prng'
import { createPatientFactory, type Census } from './generateCensus'
import type { HospitalStructure } from './generateStructure'
import type { HospitalProfile } from './hospital'

export type EdAndFlows = {
  /** Beds after reservations for boarding patients. */
  beds: Bed[]
  patients: Patient[]
  edVisits: EdVisit[]
  admissions: Admission[]
  bedRequests: BedRequest[]
  transferRequests: TransferRequest[]
}

/** Chief complaints and the specialty that admits them. */
const COMPLAINTS: ReadonlyArray<readonly [complaint: string, specialty: Code]> = [
  ['Dolor torácico', 'CAR'],
  ['Disnea', 'NML'],
  ['Dolor abdominal', 'CGD'],
  ['Fiebre sin foco', 'MIN'],
  ['Síncope', 'CAR'],
  ['Traumatismo de extremidad', 'TRA'],
  ['Cefalea intensa', 'NRL'],
  ['Mareo e inestabilidad', 'MIN'],
  ['Dolor lumbar', 'TRA'],
  ['Hemorragia digestiva', 'DIG'],
  ['Déficit neurológico focal', 'NRL'],
  ['Caída en domicilio', 'GER'],
  ['Insuficiencia respiratoria', 'NML'],
  ['Cólico renal', 'URO'],
  ['Agitación psicomotriz', 'PSQ'],
  ['Deterioro del estado general', 'MIN'],
]

const SCHEDULED_SPECIALTIES: ReadonlyArray<readonly [Code, number]> = [
  ['CGD', 4],
  ['TRA', 3],
  ['URO', 2],
  ['GOB', 2],
  ['ONC', 2],
  ['CAR', 1],
  ['NCR', 1],
  ['DIG', 1],
]

const PHASES = ['ARRIVED', 'TRIAGED', 'IN_ASSESSMENT', 'ADMIT_DECISION'] as const

/** Minutes in the ED so far, by phase (later phases have been there longer). */
const MINUTES_IN_ED: Record<(typeof PHASES)[number], readonly [number, number]> = {
  ARRIVED: [1, 25],
  TRIAGED: [10, 180],
  IN_ASSESSMENT: [30, 480],
  ADMIT_DECISION: [150, 14 * 60],
}

function priorityFor(level: TriageLevel): BedRequestPriority {
  return level <= 2 ? 'P1' : level === 3 ? 'P2' : 'P3'
}

/** ED patients, boarding (admissions + bed requests + reserved beds), scheduled admissions, transfers. */
export function generateEd(
  profile: HospitalProfile,
  structure: HospitalStructure,
  census: Census,
  rng: Rng,
  anchorAt: IsoDateTime,
): EdAndFlows {
  const r = rng.fork('ed')
  const ids = rng.fork('ed-ids')
  const newPatient = createPatientFactory(rng.fork('ed-people'), ids, anchorAt)
  const { ed: edTargets } = profile.targets
  const anchorMs = Date.parse(anchorAt)
  const stamp = { createdAt: anchorAt, updatedAt: anchorAt }
  const at = (ms: number) => new Date(Math.round(ms / 1000) * 1000).toISOString()

  const beds = census.beds.map((bed) => ({ ...bed }))
  const patients: Patient[] = []
  const edVisits: EdVisit[] = []
  const admissions: Admission[] = []
  const bedRequests: BedRequest[] = []
  const triageWeights = Object.entries(edTargets.triage).map(
    ([level, weight]) => [Number(level) as TriageLevel, weight] as const,
  )

  let reservedSoFar = 0
  for (const phase of PHASES) {
    for (let i = 0; i < edTargets.phases[phase]; i++) {
      const [complaint, specialty] = r.pick(COMPLAINTS)
      const patient = newPatient(specialty)
      patients.push(patient)

      const [min, max] = MINUTES_IN_ED[phase]
      const elapsedMs = Math.min(r.int(min, max), edTargets.maxHoursInEd * 60) * 60_000
      const arrivedMs = anchorMs - elapsedMs
      // Milestones as fractions of the time spent so far, so they are ordered and ≤ anchor.
      const triagedMs = arrivedMs + elapsedMs * (0.02 + r.float() * 0.08)
      const seenMs = arrivedMs + elapsedMs * (0.15 + r.float() * 0.25)
      const decisionMs = arrivedMs + elapsedMs * (0.45 + r.float() * 0.3)
      const triageLevel = phase === 'ARRIVED' ? undefined : r.weighted(triageWeights)

      let area: EdArea
      if (phase === 'ARRIVED') area = 'WAITING_ROOM'
      else if (phase === 'TRIAGED') area = r.chance(0.6) ? 'WAITING_ROOM' : 'BOXES'
      else if (triageLevel !== undefined && triageLevel <= 2 && r.chance(0.6)) area = 'RESUS'
      else
        area =
          phase === 'ADMIT_DECISION'
            ? r.pick(['OBSERVATION', 'BOXES'] as const)
            : r.pick(['BOXES', 'OBSERVATION'] as const)

      const visit: EdVisit = {
        id: ids.uuid(),
        ...stamp,
        patientId: patient.id,
        arrivedAt: at(arrivedMs),
        phase,
        area,
        chiefComplaint: complaint,
        ...(triageLevel !== undefined ? { triageLevel, triagedAt: at(triagedMs) } : {}),
        ...(phase === 'IN_ASSESSMENT' || phase === 'ADMIT_DECISION' ? { seenAt: at(seenMs) } : {}),
        ...(phase === 'ADMIT_DECISION'
          ? { admitDecisionAt: at(decisionMs), targetSpecialtyCode: specialty }
          : {}),
      }
      edVisits.push(visit)

      if (phase !== 'ADMIT_DECISION') continue

      // Boarding: urgent admission + bed request (+ reserved bed for the first few).
      const admissionId = ids.uuid()
      const requestedMs = Math.min(decisionMs + r.int(1, 10) * 60_000, anchorMs)
      const level = triageLevel ?? 3
      const wantsReservedBed = reservedSoFar < edTargets.boardingWithReservedBed
      const candidate = wantsReservedBed
        ? (beds.find(
            (b) =>
              b.status === 'AVAILABLE' &&
              structure.units.find((u) => u.id === b.unitId)!.specialtyCodes.includes(specialty),
          ) ?? beds.find((b) => b.status === 'AVAILABLE'))
        : undefined

      if (candidate) {
        reservedSoFar++
        candidate.status = 'RESERVED'
        candidate.patientId = patient.id
        candidate.admissionId = admissionId
        candidate.statusChangedAt = at(requestedMs + (anchorMs - requestedMs) * r.float())
      }

      admissions.push({
        id: admissionId,
        ...stamp,
        patientId: patient.id,
        type: 'URGENT',
        specialtyCode: specialty,
        status: candidate ? 'BED_ASSIGNED' : 'AWAITING_BED',
        edVisitId: visit.id,
        ...(candidate ? { bedId: candidate.id } : {}),
      })
      bedRequests.push({
        id: ids.uuid(),
        ...stamp,
        admissionId,
        requestedAt: at(requestedMs),
        priority: priorityFor(level),
        requiredUnitType: level === 1 && r.chance(0.5) ? 'ICU' : 'WARD',
        preferredSpecialtyCode: specialty,
        isolationRequired: r.chance(0.1),
        status: candidate ? 'ASSIGNED' : 'OPEN',
        ...(candidate
          ? { assignedBedId: candidate.id, etaAt: addMinutes(anchorAt, r.int(15, 60)) }
          : {}),
      })
    }
  }

  // Scheduled admissions arriving today 08:00–14:00.
  for (let i = 0; i < profile.targets.scheduledAdmissionsToday; i++) {
    const specialty = r.weighted(SCHEDULED_SPECIALTIES)
    const patient = newPatient(specialty)
    patients.push(patient)
    admissions.push({
      id: ids.uuid(),
      ...stamp,
      patientId: patient.id,
      type: 'SCHEDULED',
      specialtyCode: specialty,
      status: 'SCHEDULED',
      scheduledFor: zonedDayAt(anchorAt, HOSPITAL_TIME_ZONE, r.int(8, 13), r.pick([0, 30])),
    })
  }

  // A few open transfers of inpatients to tests or theatre.
  const occupiedBeds = r.shuffle(beds.filter((b) => b.status === 'OCCUPIED'))
  const destinations = [
    { kind: 'RADIOLOGY', label: 'Radiología', reason: 'TEST' },
    { kind: 'OR', label: 'Bloque quirúrgico', reason: 'SURGERY' },
    { kind: 'OTHER', label: 'Endoscopias', reason: 'TEST' },
  ] as const
  const transferRequests: TransferRequest[] = occupiedBeds
    .slice(0, profile.targets.openTransfers)
    .map((bed) => {
      const destination = r.pick(destinations)
      const priority = r.chance(0.2) ? 'URGENT' : 'NORMAL'
      const requestedAt = addMinutes(anchorAt, -r.int(2, 25))
      return {
        id: ids.uuid(),
        ...stamp,
        patientId: bed.patientId!,
        fromLocation: { kind: 'BED', refId: bed.id, label: bed.label },
        toLocation: { kind: destination.kind, label: destination.label },
        reason: destination.reason,
        priority,
        requestedAt,
        status: 'REQUESTED',
        slaDueAt: addMinutes(requestedAt, priority === 'URGENT' ? 10 : 30),
      }
    })

  return { beds, patients, edVisits, admissions, bedRequests, transferRequests }
}
