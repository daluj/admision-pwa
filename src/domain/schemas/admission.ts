import { z } from 'zod'
import { Code, EntityBase, Id, IsoDateTime } from './common'

export const ADMISSION_TYPES = ['URGENT', 'SCHEDULED'] as const
export const AdmissionType = z.enum(ADMISSION_TYPES)
export type AdmissionType = z.infer<typeof AdmissionType>

export const ADMISSION_STATUSES = [
  'SCHEDULED',
  'AWAITING_BED',
  'BED_ASSIGNED',
  'IN_TRANSFER',
  'ADMITTED',
  'DISCHARGE_ORDERED',
  'DISCHARGED',
  'CANCELLED',
] as const
export const AdmissionStatus = z.enum(ADMISSION_STATUSES)
export type AdmissionStatus = z.infer<typeof AdmissionStatus>

export const ADMISSION_CANCEL_REASONS = ['NO_BED', 'PATIENT', 'CLINICAL', 'OTHER'] as const
export const AdmissionCancelReason = z.enum(ADMISSION_CANCEL_REASONS)
export type AdmissionCancelReason = z.infer<typeof AdmissionCancelReason>

export const Admission = EntityBase.extend({
  patientId: Id,
  type: AdmissionType,
  specialtyCode: Code,
  status: AdmissionStatus,
  scheduledFor: IsoDateTime.optional(),
  admittedAt: IsoDateTime.optional(),
  bedId: Id.optional(),
  expectedDischargeAt: IsoDateTime.optional(),
  dischargeOrderedAt: IsoDateTime.optional(),
  dischargedAt: IsoDateTime.optional(),
  edVisitId: Id.optional(),
})
export type Admission = z.infer<typeof Admission>
