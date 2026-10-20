import { z } from 'zod'
import { EntityBase } from './common'

export const SEXES = ['F', 'M', 'X'] as const
export const Sex = z.enum(SEXES)
export type Sex = z.infer<typeof Sex>

/** Synthetic patient. `mrn` is a fictitious NHC (número de historia clínica). */
export const Patient = EntityBase.extend({
  mrn: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  sex: Sex,
  birthYear: z.int().min(1900).max(2100),
})
export type Patient = z.infer<typeof Patient>
