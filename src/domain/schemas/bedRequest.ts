import { z } from 'zod'
import { Code, EntityBase, Id, IsoDateTime } from './common'
import { UnitType } from './unit'

export const BED_REQUEST_PRIORITIES = ['P1', 'P2', 'P3'] as const
export const BedRequestPriority = z.enum(BED_REQUEST_PRIORITIES)
export type BedRequestPriority = z.infer<typeof BedRequestPriority>

export const BED_REQUEST_STATUSES = ['OPEN', 'ASSIGNED', 'FULFILLED', 'CANCELLED'] as const
export const BedRequestStatus = z.enum(BED_REQUEST_STATUSES)
export type BedRequestStatus = z.infer<typeof BedRequestStatus>

export const BedRequest = EntityBase.extend({
  admissionId: Id,
  requestedAt: IsoDateTime,
  priority: BedRequestPriority,
  requiredUnitType: UnitType,
  preferredSpecialtyCode: Code,
  isolationRequired: z.boolean(),
  status: BedRequestStatus,
  assignedBedId: Id.optional(),
  etaAt: IsoDateTime.optional(),
})
export type BedRequest = z.infer<typeof BedRequest>
