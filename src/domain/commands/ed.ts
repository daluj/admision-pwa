import { edVisitMachine } from '@/domain/state-machines'
import type {
  Admission,
  BedRequest,
  Code,
  EdArea,
  EdOutcome,
  EdVisit,
  Id,
  Patient,
  Sex,
  TriageLevel,
  UnitType,
} from '@/domain/schemas'
import { buildEvent, InvalidCommandError, putChange, requireEntity, type Command } from './types'

/** Synthetic patient data for a new registration. */
export type NewPatientData = {
  mrn: string
  firstName: string
  lastName: string
  sex: Sex
  birthYear: number
}

export type RegisterEdArrivalInput = {
  /** Existing patient, or data for a new synthetic one. */
  patient: { patientId: Id } | { data: NewPatientData }
  chiefComplaint: string
  area?: EdArea
}

/** ED registration: creates the EdVisit (and the Patient when new). Emits `EdPatientArrived`. */
export const registerEdArrival: Command<RegisterEdArrivalInput> = async (ctx, input) => {
  const changes = []
  let patientId: Id
  if ('patientId' in input.patient) {
    patientId = (await requireEntity(ctx, 'patient', input.patient.patientId)).id
  } else {
    const patient: Patient = {
      id: ctx.newId(),
      createdAt: ctx.now,
      updatedAt: ctx.now,
      ...input.patient.data,
    }
    patientId = patient.id
    changes.push(putChange(ctx, 'patient', patient))
  }

  const area = input.area ?? 'WAITING_ROOM'
  const visit: EdVisit = {
    id: ctx.newId(),
    createdAt: ctx.now,
    updatedAt: ctx.now,
    patientId,
    arrivedAt: ctx.now,
    phase: 'ARRIVED',
    area,
    chiefComplaint: input.chiefComplaint,
  }
  changes.push(putChange(ctx, 'edVisit', visit))
  return {
    events: [
      buildEvent(ctx, 'EdPatientArrived', visit.id, {
        patientId,
        area,
        chiefComplaint: input.chiefComplaint,
      }),
    ],
    changes,
  }
}

export type TriageEdPatientInput = { edVisitId: Id; triageLevel: TriageLevel; area?: EdArea }

/** Triage nurse sets the Manchester level. L1/L2 are never left in the waiting room. */
export const triageEdPatient: Command<TriageEdPatientInput> = async (ctx, input) => {
  const visit = await requireEntity(ctx, 'edVisit', input.edVisitId)
  const phase = edVisitMachine.next(visit.phase, 'triage')
  const urgent = input.triageLevel <= 2
  const area: EdArea =
    input.area ?? (input.triageLevel === 1 ? 'RESUS' : urgent ? 'BOXES' : visit.area)
  if (urgent && area === 'WAITING_ROOM') {
    throw new InvalidCommandError(
      `Triage level ${input.triageLevel} cannot wait in the waiting room`,
    )
  }
  const next: EdVisit = {
    ...visit,
    phase,
    triageLevel: input.triageLevel,
    triagedAt: ctx.now,
    area,
  }
  return {
    events: [
      buildEvent(ctx, 'EdPatientTriaged', visit.id, {
        triageLevel: input.triageLevel,
        ...(area !== visit.area ? { area } : {}),
      }),
    ],
    changes: [putChange(ctx, 'edVisit', next)],
  }
}

/** A physician sees the patient: waiting-room patients move to a box. Emits `EdAssessmentStarted`. */
export const startEdAssessment: Command<{ edVisitId: Id }> = async (ctx, { edVisitId }) => {
  const visit = await requireEntity(ctx, 'edVisit', edVisitId)
  const phase = edVisitMachine.next(visit.phase, 'startAssessment')
  const area: EdArea = visit.area === 'WAITING_ROOM' ? 'BOXES' : visit.area
  const next: EdVisit = { ...visit, phase, seenAt: ctx.now, area }
  return {
    events: [buildEvent(ctx, 'EdAssessmentStarted', visit.id, {})],
    changes: [putChange(ctx, 'edVisit', next)],
  }
}

export type DecideAdmissionInput = {
  edVisitId: Id
  targetSpecialtyCode: Code
  requiredUnitType?: UnitType
  isolationRequired?: boolean
}

function priorityFor(level: TriageLevel | undefined) {
  return level === undefined || level <= 2 ? 'P1' : level === 3 ? 'P2' : 'P3'
}

/**
 * ED physician decides to admit: the visit becomes boarding, an URGENT admission starts in
 * `AWAITING_BED` and an `OPEN` bed request is created. Emits `AdmissionDecided` + `BedRequested`.
 */
export const decideAdmission: Command<DecideAdmissionInput> = async (ctx, input) => {
  const visit = await requireEntity(ctx, 'edVisit', input.edVisitId)
  const phase = edVisitMachine.next(visit.phase, 'decideAdmission')
  const specialties = await ctx.repositories.specialty.list()
  if (!specialties.some((s) => s.code === input.targetSpecialtyCode)) {
    throw new InvalidCommandError(`Unknown specialty ${input.targetSpecialtyCode}`)
  }

  const requiredUnitType = input.requiredUnitType ?? 'WARD'
  const isolationRequired = input.isolationRequired ?? false
  const admission: Admission = {
    id: ctx.newId(),
    createdAt: ctx.now,
    updatedAt: ctx.now,
    patientId: visit.patientId,
    type: 'URGENT',
    specialtyCode: input.targetSpecialtyCode,
    status: 'AWAITING_BED',
    edVisitId: visit.id,
  }
  const request: BedRequest = {
    id: ctx.newId(),
    createdAt: ctx.now,
    updatedAt: ctx.now,
    admissionId: admission.id,
    requestedAt: ctx.now,
    priority: priorityFor(visit.triageLevel),
    requiredUnitType,
    preferredSpecialtyCode: input.targetSpecialtyCode,
    isolationRequired,
    status: 'OPEN',
  }
  const next: EdVisit = {
    ...visit,
    phase,
    admitDecisionAt: ctx.now,
    targetSpecialtyCode: input.targetSpecialtyCode,
  }
  return {
    events: [
      buildEvent(ctx, 'AdmissionDecided', visit.id, {
        admissionId: admission.id,
        targetSpecialtyCode: input.targetSpecialtyCode,
      }),
      buildEvent(ctx, 'BedRequested', request.id, {
        admissionId: admission.id,
        priority: request.priority,
        requiredUnitType,
        preferredSpecialtyCode: input.targetSpecialtyCode,
        isolationRequired,
      }),
    ],
    changes: [
      putChange(ctx, 'edVisit', next),
      putChange(ctx, 'admission', admission),
      putChange(ctx, 'bedRequest', request),
    ],
  }
}

export type RegisterEdDepartureInput = { edVisitId: Id; outcome: EdOutcome }

/**
 * The patient leaves the ED. `ADMITTED` is only allowed once the linked admission is in a bed
 * (`ADMITTED` or later). Emits `EdPatientLeft`.
 */
export const registerEdDeparture: Command<RegisterEdDepartureInput> = async (ctx, input) => {
  const visit = await requireEntity(ctx, 'edVisit', input.edVisitId)
  const phase = edVisitMachine.next(visit.phase, 'leave', { outcome: input.outcome })
  if (input.outcome === 'ADMITTED') {
    const admissions = await ctx.repositories.admission.list()
    const admission = admissions.find((a) => a.edVisitId === visit.id)
    if (!admission || !admissionInBed(admission)) {
      throw new InvalidCommandError(`ED visit ${visit.id} has no admitted admission`)
    }
  }
  const next: EdVisit = { ...visit, phase, endedAt: ctx.now, outcome: input.outcome }
  return {
    events: [buildEvent(ctx, 'EdPatientLeft', visit.id, { outcome: input.outcome })],
    changes: [putChange(ctx, 'edVisit', next)],
  }
}

function admissionInBed(admission: Admission): boolean {
  return (
    admission.status === 'ADMITTED' ||
    admission.status === 'DISCHARGE_ORDERED' ||
    admission.status === 'DISCHARGED'
  )
}
