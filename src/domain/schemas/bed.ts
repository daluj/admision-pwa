import { z } from 'zod'
import { EntityBase, Id, IsoDateTime } from './common'

export const BED_STATUSES = [
  'AVAILABLE',
  'RESERVED',
  'OCCUPIED',
  'PENDING_CLEANING',
  'CLEANING',
  'BLOCKED',
] as const
export const BedStatus = z.enum(BED_STATUSES)
export type BedStatus = z.infer<typeof BedStatus>

export const Bed = EntityBase.extend({
  unitId: Id,
  label: z.string().min(1),
  status: BedStatus,
  patientId: Id.optional(),
  admissionId: Id.optional(),
  isolation: z.boolean().optional(),
  blockedReason: z.string().min(1).optional(),
  statusChangedAt: IsoDateTime,
})
export type Bed = z.infer<typeof Bed>
