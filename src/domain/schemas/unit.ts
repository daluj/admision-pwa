import { z } from 'zod'
import { Code, EntityBase } from './common'

export const UNIT_TYPES = ['WARD', 'ICU', 'INTERMEDIATE', 'ED', 'OTHER'] as const
export const UnitType = z.enum(UNIT_TYPES)
export type UnitType = z.infer<typeof UnitType>

export const Unit = EntityBase.extend({
  code: Code,
  name: z.string().min(1),
  building: z.string().min(1),
  floor: z.int(),
  type: UnitType,
  specialtyCodes: z.array(Code),
  capacity: z.int().nonnegative(),
})
export type Unit = z.infer<typeof Unit>
