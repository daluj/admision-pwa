import type {
  Admission,
  AdmissionCancelReason,
  BedRequest,
  BedRequestPriority,
  Code,
  Id,
  IsoDateTime,
  Patient,
  UnitType,
} from '@/domain/schemas'
import { admissionMachine, bedMachine } from '@/domain/state-machines'
import type { NewPatientData } from './ed'
import { cancelPendingBedTransfers } from './transferCleanup'
import {
  buildEvent,
  InvalidCommandError,
  putChange,
  requireEntity,
  type Command,
  type CommandContext,
} from './types'

/** An expected discharge can be set at most this many days ahead (`specs/domain.md`). */
export const ADMISSION_MAX_DAYS_AHEAD = 7

async function requireSpecialty(ctx: CommandContext, code: Code) {
  const specialties = await ctx.repositories.specialty.list()
  if (!specialties.some((s) => s.code === code)) {
    throw new InvalidCommandError(`Unknown specialty ${code}`)
  }
}

export type CreateScheduledAdmissionInput = {
  patient: { patientId: Id } | { data: NewPatientData }
  specialtyCode: Code
  scheduledFor: IsoDateTime
}

/** Admissions plans a scheduled admission (creates the Patient when new). */
export const createScheduledAdmission: Command<CreateScheduledAdmissionInput> = async (
  ctx,
  input,
) => {
  await requireSpecialty(ctx, input.specialtyCode)
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
  const admission: Admission = {
    id: ctx.newId(),
    createdAt: ctx.now,
    updatedAt: ctx.now,
    patientId,
    type: 'SCHEDULED',
    specialtyCode: input.specialtyCode,
    status: 'SCHEDULED',
    scheduledFor: input.scheduledFor,
  }
  changes.push(putChange(ctx, 'admission', admission))
  return {
    events: [
      buildEvent(ctx, 'ScheduledAdmissionCreated', admission.id, {
        patientId,
        specialtyCode: input.specialtyCode,
        scheduledFor: input.scheduledFor,
      }),
    ],
    changes,
  }
}

export type RequestBedForScheduledInput = {
  admissionId: Id
  requiredUnitType?: UnitType
  isolationRequired?: boolean
  priority?: BedRequestPriority
}

/** A scheduled patient has arrived and needs a bed: Admission `AWAITING_BED` + `OPEN` request. */
export const requestBedForScheduled: Command<RequestBedForScheduledInput> = async (ctx, input) => {
  const admission = await requireEntity(ctx, 'admission', input.admissionId)
  if (admission.type !== 'SCHEDULED') {
    throw new InvalidCommandError(`Admission ${admission.id} is not scheduled`)
  }
  const status = admissionMachine.next(admission.status, 'requestBed')
  const request: BedRequest = {
    id: ctx.newId(),
    createdAt: ctx.now,
    updatedAt: ctx.now,
    admissionId: admission.id,
    requestedAt: ctx.now,
    priority: input.priority ?? 'P2',
    requiredUnitType: input.requiredUnitType ?? 'WARD',
    preferredSpecialtyCode: admission.specialtyCode,
    isolationRequired: input.isolationRequired ?? false,
    status: 'OPEN',
  }
  return {
    events: [
      buildEvent(ctx, 'BedRequested', request.id, {
        admissionId: admission.id,
        priority: request.priority,
        requiredUnitType: request.requiredUnitType,
        preferredSpecialtyCode: request.preferredSpecialtyCode,
        isolationRequired: request.isolationRequired,
      }),
    ],
    changes: [
      putChange(ctx, 'admission', { ...admission, status }),
      putChange(ctx, 'bedRequest', request),
    ],
  }
}

export type CancelAdmissionInput = { admissionId: Id; reason: AdmissionCancelReason }

/**
 * Cancels an admission that is not in a bed yet. Its bed request is cancelled too and a reserved
 * bed is released (`AdmissionCancelled` + `BedReservationReleased`).
 */
export const cancelAdmission: Command<CancelAdmissionInput> = async (ctx, input) => {
  const admission = await requireEntity(ctx, 'admission', input.admissionId)
  const status = admissionMachine.next(admission.status, 'cancel')
  const requests = await ctx.repositories.bedRequest.list()
  const request = requests.find(
    (r) => r.admissionId === admission.id && (r.status === 'OPEN' || r.status === 'ASSIGNED'),
  )

  const events = [buildEvent(ctx, 'AdmissionCancelled', admission.id, { reason: input.reason })]
  const { bedId: _bed, ...admissionRest } = admission
  const changes = [putChange(ctx, 'admission', { ...admissionRest, status })]

  if (request) {
    const { assignedBedId: _b, etaAt: _e, ...requestRest } = request
    changes.push(putChange(ctx, 'bedRequest', { ...requestRest, status: 'CANCELLED' }))
  }
  if (admission.bedId) {
    const bed = await requireEntity(ctx, 'bed', admission.bedId)
    const bedStatus = bedMachine.next(bed.status, 'release')
    const { patientId: _p, admissionId: _a, ...bedRest } = bed
    changes.push(putChange(ctx, 'bed', { ...bedRest, status: bedStatus, statusChangedAt: ctx.now }))
    events.push(
      buildEvent(ctx, 'BedReservationReleased', bed.id, {
        ...(request ? { bedRequestId: request.id } : {}),
        reason: 'ADMISSION_CANCELLED',
      }),
    )
    const transfers = await cancelPendingBedTransfers(
      ctx,
      admission.patientId,
      bed.id,
      'ADMISSION_CANCELLED',
    )
    events.push(...transfers.events)
    changes.push(...transfers.changes)
  }
  return { events, changes }
}

export type SetExpectedDischargeInput = { admissionId: Id; expectedDischargeAt: IsoDateTime }

/** The unit sets (or moves) the expected discharge of an inpatient. */
export const setExpectedDischarge: Command<SetExpectedDischargeInput> = async (ctx, input) => {
  const admission = await requireEntity(ctx, 'admission', input.admissionId)
  if (admission.status !== 'ADMITTED') {
    throw new InvalidCommandError(`Admission ${admission.id} is ${admission.status}, not ADMITTED`)
  }
  const expectedMs = Date.parse(input.expectedDischargeAt)
  const nowMs = Date.parse(ctx.now)
  if (expectedMs <= nowMs) {
    throw new InvalidCommandError('The expected discharge must be in the future')
  }
  if (expectedMs - nowMs > ADMISSION_MAX_DAYS_AHEAD * 24 * 60 * 60_000) {
    throw new InvalidCommandError(
      `The expected discharge is more than ${ADMISSION_MAX_DAYS_AHEAD} days ahead`,
    )
  }
  return {
    events: [
      buildEvent(ctx, 'ExpectedDischargeSet', admission.id, {
        expectedDischargeAt: input.expectedDischargeAt,
      }),
    ],
    changes: [
      putChange(ctx, 'admission', {
        ...admission,
        expectedDischargeAt: input.expectedDischargeAt,
      }),
    ],
  }
}

/** A physician orders the discharge: Admission `DISCHARGE_ORDERED`. */
export const orderDischarge: Command<{ admissionId: Id }> = async (ctx, { admissionId }) => {
  const admission = await requireEntity(ctx, 'admission', admissionId)
  const status = admissionMachine.next(admission.status, 'orderDischarge')
  return {
    events: [buildEvent(ctx, 'DischargeOrdered', admission.id, {})],
    changes: [putChange(ctx, 'admission', { ...admission, status, dischargeOrderedAt: ctx.now })],
  }
}
