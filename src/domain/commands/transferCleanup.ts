import type { Change } from '@/data/ports'
import type { Id, NewHospitalEvent } from '@/domain/schemas'
import { buildEvent, putChange, type CommandContext } from './types'

/**
 * When a bed reservation ends (released or the admission cancelled), the admission transfers
 * that were heading to that bed and have not been picked up are cancelled and their porters
 * freed. Returns the extra events and changes to append with the command's own.
 */
export async function cancelPendingBedTransfers(
  ctx: CommandContext,
  patientId: Id,
  bedId: Id,
  reason: string,
): Promise<{ events: NewHospitalEvent[]; changes: Change[] }> {
  const transfers = await ctx.repositories.transferRequest.list()
  const events: NewHospitalEvent[] = []
  const changes: Change[] = []
  for (const transfer of transfers) {
    if (
      transfer.reason !== 'ADMISSION' ||
      transfer.patientId !== patientId ||
      transfer.toLocation.refId !== bedId ||
      (transfer.status !== 'REQUESTED' && transfer.status !== 'ASSIGNED')
    ) {
      continue
    }
    changes.push(putChange(ctx, 'transferRequest', { ...transfer, status: 'CANCELLED' }))
    events.push(buildEvent(ctx, 'TransferCancelled', transfer.id, { reason }))
    if (transfer.porterId) {
      const porter = await ctx.repositories.porter.get(transfer.porterId)
      if (porter) changes.push(putChange(ctx, 'porter', { ...porter, status: 'AVAILABLE' }))
    }
  }
  return { events, changes }
}
