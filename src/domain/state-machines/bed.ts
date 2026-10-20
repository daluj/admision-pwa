import { BED_STATUSES, type BedStatus } from '../schemas/bed'
import { defineMachine } from './machine'

export const BED_ACTIONS = [
  'reserve',
  'release',
  'occupy',
  'discharge',
  'transferOut',
  'startCleaning',
  'finishCleaning',
  'block',
  'unblock',
] as const
export type BedAction = (typeof BED_ACTIONS)[number]

export const bedMachine = defineMachine<BedStatus, BedAction>({
  entity: 'Bed',
  states: BED_STATUSES,
  actions: BED_ACTIONS,
  transitions: {
    AVAILABLE: { reserve: 'RESERVED', block: 'BLOCKED' },
    RESERVED: { occupy: 'OCCUPIED', release: 'AVAILABLE' },
    OCCUPIED: { discharge: 'PENDING_CLEANING', transferOut: 'PENDING_CLEANING' },
    PENDING_CLEANING: { startCleaning: 'CLEANING', block: 'BLOCKED' },
    CLEANING: { finishCleaning: 'AVAILABLE', block: 'BLOCKED' },
    BLOCKED: { unblock: 'AVAILABLE' },
  },
})
