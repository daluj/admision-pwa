import { z } from 'zod'
import { EntityBase, Id, IsoDateTime, Location } from './common'

export const TRANSFER_REASONS = ['ADMISSION', 'INTER_UNIT', 'TEST', 'SURGERY', 'RETURN'] as const
export const TransferReason = z.enum(TRANSFER_REASONS)
export type TransferReason = z.infer<typeof TransferReason>

export const TRANSFER_PRIORITIES = ['URGENT', 'NORMAL'] as const
export const TransferPriority = z.enum(TRANSFER_PRIORITIES)
export type TransferPriority = z.infer<typeof TransferPriority>

export const TRANSFER_STATUSES = [
  'REQUESTED',
  'ASSIGNED',
  'PICKED_UP',
  'DELIVERED',
  'CANCELLED',
] as const
export const TransferStatus = z.enum(TRANSFER_STATUSES)
export type TransferStatus = z.infer<typeof TransferStatus>

export const TransferRequest = EntityBase.extend({
  patientId: Id,
  fromLocation: Location,
  toLocation: Location,
  reason: TransferReason,
  priority: TransferPriority,
  requestedAt: IsoDateTime,
  status: TransferStatus,
  porterId: Id.optional(),
  assignedAt: IsoDateTime.optional(),
  pickedUpAt: IsoDateTime.optional(),
  deliveredAt: IsoDateTime.optional(),
  slaDueAt: IsoDateTime,
})
export type TransferRequest = z.infer<typeof TransferRequest>
