import { Admission } from './admission'
import { Alert } from './alert'
import { Bed } from './bed'
import { BedRequest } from './bedRequest'
import { EdVisit } from './edVisit'
import { Patient } from './patient'
import { Porter } from './porter'
import { SimulationState } from './simulationState'
import { Specialty } from './specialty'
import { TransferRequest } from './transferRequest'
import { Unit } from './unit'
import { User } from './user'

export * from './admission'
export * from './alert'
export * from './bed'
export * from './bedRequest'
export * from './common'
export * from './edVisit'
export * from './events'
export * from './patient'
export * from './porter'
export * from './simulationState'
export * from './specialty'
export * from './transferRequest'
export * from './unit'
export * from './user'

/** Schema per stored entity, keyed by entity name (one table/collection each). */
export const entitySchemas = {
  specialty: Specialty,
  unit: Unit,
  bed: Bed,
  patient: Patient,
  edVisit: EdVisit,
  admission: Admission,
  bedRequest: BedRequest,
  transferRequest: TransferRequest,
  porter: Porter,
  user: User,
  alert: Alert,
  simulationState: SimulationState,
} as const

export type EntitySchemas = typeof entitySchemas
export type EntityName = keyof EntitySchemas
export type EntityOf<N extends EntityName> = EntitySchemas[N]['_output']

export const ENTITY_NAMES = Object.keys(entitySchemas) as EntityName[]

export function isEntityName(value: string): value is EntityName {
  return Object.hasOwn(entitySchemas, value)
}
