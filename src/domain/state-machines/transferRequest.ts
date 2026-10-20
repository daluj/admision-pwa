import { TRANSFER_STATUSES, type TransferStatus } from '../schemas/transferRequest'
import { defineMachine } from './machine'

export const TRANSFER_ACTIONS = ['assign', 'pickUp', 'deliver', 'cancel'] as const
export type TransferAction = (typeof TRANSFER_ACTIONS)[number]

export const transferRequestMachine = defineMachine<TransferStatus, TransferAction>({
  entity: 'TransferRequest',
  states: TRANSFER_STATUSES,
  actions: TRANSFER_ACTIONS,
  transitions: {
    REQUESTED: { assign: 'ASSIGNED', cancel: 'CANCELLED' },
    ASSIGNED: { pickUp: 'PICKED_UP', cancel: 'CANCELLED' },
    PICKED_UP: { deliver: 'DELIVERED' },
    DELIVERED: {},
    CANCELLED: {},
  },
})
