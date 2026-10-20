import { z } from 'zod'
import { Code, EntityBase } from './common'

export const Specialty = EntityBase.extend({
  code: Code,
  name: z.string().min(1),
})
export type Specialty = z.infer<typeof Specialty>
