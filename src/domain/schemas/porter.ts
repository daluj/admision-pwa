import { z } from 'zod'
import { EntityBase } from './common'

export const SHIFTS = ['MORNING', 'AFTERNOON', 'NIGHT'] as const
export const Shift = z.enum(SHIFTS)
export type Shift = z.infer<typeof Shift>

export const PORTER_STATUSES = ['AVAILABLE', 'BUSY', 'OFF_SHIFT'] as const
export const PorterStatus = z.enum(PORTER_STATUSES)
export type PorterStatus = z.infer<typeof PorterStatus>

export const Porter = EntityBase.extend({
  name: z.string().min(1),
  shift: Shift,
  status: PorterStatus,
})
export type Porter = z.infer<typeof Porter>
