import { z } from 'zod'
import { EntityBase, Id } from './common'

export const ROLES = [
  'ADMISSIONS_HEAD',
  'BED_MANAGER',
  'NURSE_SUPERVISOR',
  'ED_COORDINATOR',
  'PORTER',
  'MANAGEMENT',
] as const
export const Role = z.enum(ROLES)
export type Role = z.infer<typeof Role>

/** Simulated user (fictitious). `unitId` scopes nurse supervisors to their unit; `porterId` links a porter user to their `Porter`. */
export const User = EntityBase.extend({
  username: z.string().min(1),
  displayName: z.string().min(1),
  role: Role,
  unitId: Id.optional(),
  porterId: Id.optional(),
})
export type User = z.infer<typeof User>
