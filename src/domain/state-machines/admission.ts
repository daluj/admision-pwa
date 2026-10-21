import { ADMISSION_STATUSES, type AdmissionStatus } from '../schemas/admission'
import { defineMachine } from './machine'

export const ADMISSION_ACTIONS = [
  'requestBed',
  'assignBed',
  'releaseBed',
  'startTransfer',
  'admit',
  'orderDischarge',
  'discharge',
  'cancel',
] as const
export type AdmissionAction = (typeof ADMISSION_ACTIONS)[number]

/** URGENT admissions are created directly in AWAITING_BED; SCHEDULED ones in SCHEDULED. */
export const admissionMachine = defineMachine<AdmissionStatus, AdmissionAction>({
  entity: 'Admission',
  states: ADMISSION_STATUSES,
  actions: ADMISSION_ACTIONS,
  transitions: {
    SCHEDULED: { requestBed: 'AWAITING_BED', cancel: 'CANCELLED' },
    AWAITING_BED: { assignBed: 'BED_ASSIGNED', cancel: 'CANCELLED' },
    BED_ASSIGNED: { releaseBed: 'AWAITING_BED', startTransfer: 'IN_TRANSFER', cancel: 'CANCELLED' },
    IN_TRANSFER: { admit: 'ADMITTED' },
    ADMITTED: { orderDischarge: 'DISCHARGE_ORDERED' },
    DISCHARGE_ORDERED: { discharge: 'DISCHARGED' },
    DISCHARGED: {},
    CANCELLED: {},
  },
})
