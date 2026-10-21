import {
  admitPatient,
  assignTransfer,
  deliverTransfer,
  pickUpTransfer,
  registerEdDeparture,
  requestTransfer,
} from '@/domain/commands'
import {
  TRANSFER_ASSIGN_DELAY,
  TRANSFER_DELIVER_DELAY,
  TRANSFER_PICKUP_DELAY,
  TRANSFER_REQUEST_DELAY,
} from '../normalDay.config'
import { entityInt, minutesBetween } from '../entityRandom'
import type { MinuteContext } from '../types'
import { sortedById, type World } from '../world'

const ACTIVE = ['REQUESTED', 'ASSIGNED', 'PICKED_UP']

/**
 * Porter dispatch: a reserved bed triggers an admission transfer; porters are assigned, pick up
 * and deliver after realistic delays; on arrival the patient is admitted (and leaves the ED).
 */
export async function transfersFlow(ctx: MinuteContext, world: World): Promise<void> {
  const { seed, at } = ctx

  // 1. Request a transfer for every reserved bed that has none.
  const requestsByAdmission = new Map(world.bedRequests.map((r) => [r.admissionId, r]))
  for (const admission of sortedById(world.admissions)) {
    if (admission.status !== 'BED_ASSIGNED' || !admission.bedId) continue
    const bed = world.bedById.get(admission.bedId)
    if (!bed) continue
    const covered = world.transfers.some(
      (t) => t.reason === 'ADMISSION' && t.toLocation.refId === bed.id && ACTIVE.includes(t.status),
    )
    if (covered) continue
    const wait = entityInt(seed, 'transfer-request', admission.id, TRANSFER_REQUEST_DELAY)
    if (minutesBetween(bed.statusChangedAt, at) < wait) continue

    const unit = world.unitById.get(bed.unitId)
    await ctx.exec(requestTransfer, {
      patientId: admission.patientId,
      fromLocation: admission.edVisitId
        ? { kind: 'ED', label: 'Urgencias' }
        : { kind: 'OTHER', label: 'Admisión' },
      toLocation: { kind: 'BED', refId: bed.id, label: `${unit?.name ?? ''} ${bed.label}`.trim() },
      reason: 'ADMISSION',
      priority: requestsByAdmission.get(admission.id)?.priority === 'P1' ? 'URGENT' : 'NORMAL',
    })
  }

  // 2. Assign available porters, urgent and oldest first.
  const porters = sortedById(world.porters.filter((p) => p.status === 'AVAILABLE'))
  const queue = world.transfers
    .filter((t) => t.status === 'REQUESTED')
    .sort(
      (a, b) =>
        Number(b.priority === 'URGENT') - Number(a.priority === 'URGENT') ||
        a.requestedAt.localeCompare(b.requestedAt) ||
        a.id.localeCompare(b.id),
    )
  for (const transfer of queue) {
    const porter = porters[0]
    if (!porter) break
    const wait = entityInt(
      seed,
      'transfer-assign',
      transfer.id,
      TRANSFER_ASSIGN_DELAY[transfer.priority],
    )
    if (minutesBetween(transfer.requestedAt, at) < wait) continue
    porters.shift()
    await ctx.exec(assignTransfer, { transferId: transfer.id, porterId: porter.id })
  }

  // 3. Pick up and deliver.
  for (const transfer of sortedById(world.transfers)) {
    if (transfer.status === 'ASSIGNED' && transfer.assignedAt) {
      const wait = entityInt(seed, 'transfer-pickup', transfer.id, TRANSFER_PICKUP_DELAY)
      if (minutesBetween(transfer.assignedAt, at) >= wait) {
        await ctx.exec(pickUpTransfer, { transferId: transfer.id })
      }
    } else if (transfer.status === 'PICKED_UP' && transfer.pickedUpAt) {
      const wait = entityInt(seed, 'transfer-deliver', transfer.id, TRANSFER_DELIVER_DELAY)
      if (minutesBetween(transfer.pickedUpAt, at) >= wait) {
        await ctx.exec(deliverTransfer, { transferId: transfer.id })
      }
    }
  }

  // 4. Delivered patients are admitted; ED patients leave the ED. The delivered transfer must be
  // this admission's own: same patient, same bed, delivered after the admission was created.
  const deliveredFor = (admission: (typeof world.admissions)[number]) =>
    world.transfers.some(
      (t) =>
        t.status === 'DELIVERED' &&
        t.reason === 'ADMISSION' &&
        t.patientId === admission.patientId &&
        t.toLocation.refId === admission.bedId &&
        (t.deliveredAt ?? '') >= admission.createdAt,
    )
  for (const admission of sortedById(world.admissions)) {
    if (admission.status !== 'IN_TRANSFER' || !admission.bedId) continue
    if (!deliveredFor(admission)) continue
    const admitted = await ctx.exec(admitPatient, { admissionId: admission.id })
    const visit = world.edVisits.find((v) => v.id === admission.edVisitId)
    if (admitted && visit?.phase === 'ADMIT_DECISION') {
      await ctx.exec(registerEdDeparture, { edVisitId: visit.id, outcome: 'ADMITTED' })
    }
  }
}
