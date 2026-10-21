import type { Admission, Bed, BedRequest, Id, IsoDateTime } from '@/domain/schemas'
import { admissionMachine, bedMachine } from '@/domain/state-machines'
import {
  buildEvent,
  InvalidCommandError,
  putChange,
  requireEntity,
  type Command,
  type CommandContext,
} from './types'

async function unitTypeOf(ctx: CommandContext, bed: Bed) {
  return (await requireEntity(ctx, 'unit', bed.unitId)).type
}

export type ReserveBedInput = { bedRequestId: Id; bedId: Id; etaAt?: IsoDateTime }

/**
 * Bed manager reserves a bed for an open request. The bed must be free, of the requested unit
 * type, and isolation-capable when required (specialty is a preference: outliers are allowed).
 * Updates Bed (`RESERVED`), BedRequest (`ASSIGNED`) and Admission (`BED_ASSIGNED`).
 */
export const reserveBed: Command<ReserveBedInput> = async (ctx, input) => {
  const request = await requireEntity(ctx, 'bedRequest', input.bedRequestId)
  if (request.status !== 'OPEN') {
    throw new InvalidCommandError(`Bed request ${request.id} is ${request.status}, not OPEN`)
  }
  const bed = await requireEntity(ctx, 'bed', input.bedId)
  const admission = await requireEntity(ctx, 'admission', request.admissionId)

  const status = bedMachine.next(bed.status, 'reserve')
  if ((await unitTypeOf(ctx, bed)) !== request.requiredUnitType) {
    throw new InvalidCommandError(`Bed ${bed.label} is not in a ${request.requiredUnitType} unit`)
  }
  if (request.isolationRequired && !bed.isolation) {
    throw new InvalidCommandError(`Bed ${bed.label} has no isolation capability`)
  }
  const admissionStatus = admissionMachine.next(admission.status, 'assignBed')

  const nextBed: Bed = {
    ...bed,
    status,
    patientId: admission.patientId,
    admissionId: admission.id,
    statusChangedAt: ctx.now,
  }
  const nextRequest: BedRequest = {
    ...request,
    status: 'ASSIGNED',
    assignedBedId: bed.id,
    ...(input.etaAt ? { etaAt: input.etaAt } : {}),
  }
  const nextAdmission: Admission = { ...admission, status: admissionStatus, bedId: bed.id }
  return {
    events: [
      buildEvent(ctx, 'BedReserved', bed.id, {
        bedRequestId: request.id,
        admissionId: admission.id,
        ...(input.etaAt ? { etaAt: input.etaAt } : {}),
      }),
    ],
    changes: [
      putChange(ctx, 'bed', nextBed),
      putChange(ctx, 'bedRequest', nextRequest),
      putChange(ctx, 'admission', nextAdmission),
    ],
  }
}

export type ReleaseBedReservationInput = { bedId: Id; reason?: string }

/** Releases a reservation: the bed is free again and the request and admission wait for a bed. */
export const releaseBedReservation: Command<ReleaseBedReservationInput> = async (ctx, input) => {
  const bed = await requireEntity(ctx, 'bed', input.bedId)
  const status = bedMachine.next(bed.status, 'release')
  const admission = await requireEntity(ctx, 'admission', bed.admissionId ?? '')
  const admissionStatus = admissionMachine.next(admission.status, 'releaseBed')
  const requests = await ctx.repositories.bedRequest.list()
  const request = requests.find((r) => r.admissionId === admission.id && r.assignedBedId === bed.id)

  const { patientId: _p, admissionId: _a, ...rest } = bed
  const nextBed: Bed = { ...rest, status, statusChangedAt: ctx.now }
  const { bedId: _b, ...admissionRest } = admission
  const nextAdmission: Admission = { ...admissionRest, status: admissionStatus }
  const changes = [putChange(ctx, 'bed', nextBed), putChange(ctx, 'admission', nextAdmission)]
  if (request) {
    const { assignedBedId: _ab, etaAt: _eta, ...requestRest } = request
    changes.push(putChange(ctx, 'bedRequest', { ...requestRest, status: 'OPEN' }))
  }
  return {
    events: [
      buildEvent(ctx, 'BedReservationReleased', bed.id, {
        ...(request ? { bedRequestId: request.id } : {}),
        ...(input.reason ? { reason: input.reason } : {}),
      }),
    ],
    changes,
  }
}

/**
 * The patient arrives in the reserved bed (the admission must be `IN_TRANSFER`). Bed `OCCUPIED`,
 * Admission `ADMITTED`, BedRequest `FULFILLED`. Emits `PatientAdmitted`.
 */
export const admitPatient: Command<{ admissionId: Id }> = async (ctx, { admissionId }) => {
  const admission = await requireEntity(ctx, 'admission', admissionId)
  const admissionStatus = admissionMachine.next(admission.status, 'admit')
  const bed = await requireEntity(ctx, 'bed', admission.bedId ?? '')
  const status = bedMachine.next(bed.status, 'occupy')
  const requests = await ctx.repositories.bedRequest.list()
  const request = requests.find((r) => r.admissionId === admission.id && r.status === 'ASSIGNED')

  const changes = [
    putChange(ctx, 'bed', { ...bed, status, statusChangedAt: ctx.now }),
    putChange(ctx, 'admission', { ...admission, status: admissionStatus, admittedAt: ctx.now }),
  ]
  if (request) changes.push(putChange(ctx, 'bedRequest', { ...request, status: 'FULFILLED' }))
  return {
    events: [
      buildEvent(ctx, 'PatientAdmitted', admission.id, {
        patientId: admission.patientId,
        bedId: bed.id,
      }),
    ],
    changes,
  }
}

/** Discharge: Admission `DISCHARGED` (must be `DISCHARGE_ORDERED`), bed `PENDING_CLEANING`. */
export const dischargePatient: Command<{ admissionId: Id }> = async (ctx, { admissionId }) => {
  const admission = await requireEntity(ctx, 'admission', admissionId)
  const admissionStatus = admissionMachine.next(admission.status, 'discharge')
  const bed = await requireEntity(ctx, 'bed', admission.bedId ?? '')
  const status = bedMachine.next(bed.status, 'discharge')

  const { patientId: _p, admissionId: _a, ...bedRest } = bed
  return {
    events: [buildEvent(ctx, 'PatientDischarged', admission.id, { bedId: bed.id })],
    changes: [
      putChange(ctx, 'bed', { ...bedRest, status, statusChangedAt: ctx.now }),
      putChange(ctx, 'admission', {
        ...admission,
        status: admissionStatus,
        dischargedAt: ctx.now,
      }),
    ],
  }
}

function bedTransition(
  action: 'startCleaning' | 'finishCleaning' | 'unblock',
  type: 'BedCleaningStarted' | 'BedCleaningFinished' | 'BedUnblocked',
): Command<{ bedId: Id }> {
  return async (ctx, { bedId }) => {
    const bed = await requireEntity(ctx, 'bed', bedId)
    const status = bedMachine.next(bed.status, action)
    const { blockedReason: _reason, ...rest } = bed
    return {
      events: [buildEvent(ctx, type, bed.id, {})],
      changes: [putChange(ctx, 'bed', { ...rest, status, statusChangedAt: ctx.now })],
    }
  }
}

/** Housekeeping starts cleaning a dirty bed. Emits `BedCleaningStarted`. */
export const startCleaning = bedTransition('startCleaning', 'BedCleaningStarted')
/** Cleaning done: the bed is available again. Emits `BedCleaningFinished`. */
export const finishCleaning = bedTransition('finishCleaning', 'BedCleaningFinished')
/** A blocked bed is operational again. Emits `BedUnblocked`. */
export const unblockBed = bedTransition('unblock', 'BedUnblocked')

/** Blocks a free or dirty bed with a reason. Emits `BedBlocked`. */
export const blockBed: Command<{ bedId: Id; reason: string }> = async (ctx, input) => {
  if (input.reason.trim() === '') throw new InvalidCommandError('A block needs a reason')
  const bed = await requireEntity(ctx, 'bed', input.bedId)
  const status = bedMachine.next(bed.status, 'block')
  return {
    events: [buildEvent(ctx, 'BedBlocked', bed.id, { reason: input.reason })],
    changes: [
      putChange(ctx, 'bed', {
        ...bed,
        status,
        blockedReason: input.reason,
        statusChangedAt: ctx.now,
      }),
    ],
  }
}

/**
 * Moves an inpatient to another free bed: the old bed goes to `PENDING_CLEANING`, the new one
 * becomes `OCCUPIED` straight away (reserve + occupy). Emits `PatientTransferredBetweenBeds`.
 */
export const transferBetweenBeds: Command<{ admissionId: Id; toBedId: Id }> = async (
  ctx,
  { admissionId, toBedId },
) => {
  const admission = await requireEntity(ctx, 'admission', admissionId)
  if (admission.status !== 'ADMITTED' && admission.status !== 'DISCHARGE_ORDERED') {
    throw new InvalidCommandError(`Admission ${admission.id} is not in a bed`)
  }
  const from = await requireEntity(ctx, 'bed', admission.bedId ?? '')
  const to = await requireEntity(ctx, 'bed', toBedId)
  if (from.id === to.id) throw new InvalidCommandError('Source and target bed are the same')

  const fromStatus = bedMachine.next(from.status, 'transferOut')
  const reserved = bedMachine.next(to.status, 'reserve')
  const toStatus = bedMachine.next(reserved, 'occupy')

  const { patientId: _p, admissionId: _a, ...fromRest } = from
  return {
    events: [
      buildEvent(ctx, 'PatientTransferredBetweenBeds', admission.id, {
        fromBedId: from.id,
        toBedId: to.id,
      }),
    ],
    changes: [
      putChange(ctx, 'bed', { ...fromRest, status: fromStatus, statusChangedAt: ctx.now }),
      putChange(ctx, 'bed', {
        ...to,
        status: toStatus,
        patientId: admission.patientId,
        admissionId: admission.id,
        statusChangedAt: ctx.now,
      }),
      putChange(ctx, 'admission', { ...admission, bedId: to.id }),
    ],
  }
}
