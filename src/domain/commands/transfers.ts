import type {
  Id,
  Location,
  TransferPriority,
  TransferReason,
  TransferRequest,
} from '@/domain/schemas'
import { admissionMachine, transferRequestMachine } from '@/domain/state-machines'
import { addMinutes } from '@/lib/time'
import { buildEvent, InvalidCommandError, putChange, requireEntity, type Command } from './types'

/** Minutes allowed from request to pickup (`specs/domain.md` → Transfers KPIs). */
export const TRANSFER_SLA_MINUTES: Record<TransferPriority, number> = { URGENT: 10, NORMAL: 30 }

export type RequestTransferInput = {
  patientId: Id
  fromLocation: Location
  toLocation: Location
  reason: TransferReason
  priority: TransferPriority
}

/** Anyone requests a porter. The pickup SLA is derived from the priority. Emits `TransferRequested`. */
export const requestTransfer: Command<RequestTransferInput> = async (ctx, input) => {
  await requireEntity(ctx, 'patient', input.patientId)
  const transfer: TransferRequest = {
    id: ctx.newId(),
    createdAt: ctx.now,
    updatedAt: ctx.now,
    patientId: input.patientId,
    fromLocation: input.fromLocation,
    toLocation: input.toLocation,
    reason: input.reason,
    priority: input.priority,
    requestedAt: ctx.now,
    status: 'REQUESTED',
    slaDueAt: addMinutes(ctx.now, TRANSFER_SLA_MINUTES[input.priority]),
  }
  return {
    events: [
      buildEvent(ctx, 'TransferRequested', transfer.id, {
        patientId: transfer.patientId,
        fromLocation: transfer.fromLocation,
        toLocation: transfer.toLocation,
        reason: transfer.reason,
        priority: transfer.priority,
        slaDueAt: transfer.slaDueAt,
      }),
    ],
    changes: [putChange(ctx, 'transferRequest', transfer)],
  }
}

/** Dispatch assigns an available porter, who becomes `BUSY`. Emits `TransferAssigned`. */
export const assignTransfer: Command<{ transferId: Id; porterId: Id }> = async (ctx, input) => {
  const transfer = await requireEntity(ctx, 'transferRequest', input.transferId)
  const status = transferRequestMachine.next(transfer.status, 'assign')
  const porter = await requireEntity(ctx, 'porter', input.porterId)
  if (porter.status !== 'AVAILABLE') {
    throw new InvalidCommandError(`Porter ${porter.id} is ${porter.status}, not AVAILABLE`)
  }
  return {
    events: [buildEvent(ctx, 'TransferAssigned', transfer.id, { porterId: porter.id })],
    changes: [
      putChange(ctx, 'transferRequest', {
        ...transfer,
        status,
        porterId: porter.id,
        assignedAt: ctx.now,
      }),
      putChange(ctx, 'porter', { ...porter, status: 'BUSY' }),
    ],
  }
}

/**
 * The porter picks the patient up. For an admission transfer into a reserved bed the admission
 * moves to `IN_TRANSFER`. Emits `TransferPickedUp`.
 */
export const pickUpTransfer: Command<{ transferId: Id }> = async (ctx, { transferId }) => {
  const transfer = await requireEntity(ctx, 'transferRequest', transferId)
  const status = transferRequestMachine.next(transfer.status, 'pickUp')
  const changes = [putChange(ctx, 'transferRequest', { ...transfer, status, pickedUpAt: ctx.now })]

  const { toLocation } = transfer
  if (transfer.reason === 'ADMISSION' && toLocation.kind === 'BED' && toLocation.refId) {
    const bed = await requireEntity(ctx, 'bed', toLocation.refId)
    const admission = bed.admissionId
      ? await ctx.repositories.admission.get(bed.admissionId)
      : undefined
    if (admission && admissionMachine.can(admission.status, 'startTransfer')) {
      changes.push(
        putChange(ctx, 'admission', {
          ...admission,
          status: admissionMachine.next(admission.status, 'startTransfer'),
        }),
      )
    }
  }
  return { events: [buildEvent(ctx, 'TransferPickedUp', transfer.id, {})], changes }
}

/** The patient reaches the destination; the porter is free again. Emits `TransferDelivered`. */
export const deliverTransfer: Command<{ transferId: Id }> = async (ctx, { transferId }) => {
  const transfer = await requireEntity(ctx, 'transferRequest', transferId)
  const status = transferRequestMachine.next(transfer.status, 'deliver')
  const changes = [putChange(ctx, 'transferRequest', { ...transfer, status, deliveredAt: ctx.now })]
  if (transfer.porterId) {
    const porter = await requireEntity(ctx, 'porter', transfer.porterId)
    changes.push(putChange(ctx, 'porter', { ...porter, status: 'AVAILABLE' }))
  }
  return { events: [buildEvent(ctx, 'TransferDelivered', transfer.id, {})], changes }
}

/** Cancels a transfer that has not been picked up; an assigned porter is released. */
export const cancelTransfer: Command<{ transferId: Id; reason?: string }> = async (ctx, input) => {
  const transfer = await requireEntity(ctx, 'transferRequest', input.transferId)
  const status = transferRequestMachine.next(transfer.status, 'cancel')
  const changes = [putChange(ctx, 'transferRequest', { ...transfer, status })]
  if (transfer.porterId) {
    const porter = await requireEntity(ctx, 'porter', transfer.porterId)
    changes.push(putChange(ctx, 'porter', { ...porter, status: 'AVAILABLE' }))
  }
  return {
    events: [
      buildEvent(
        ctx,
        'TransferCancelled',
        transfer.id,
        input.reason ? { reason: input.reason } : {},
      ),
    ],
    changes,
  }
}
