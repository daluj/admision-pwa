import { z } from 'zod'

/** Opaque string identifier (UUID in practice; ids are provided by the caller). */
export const Id = z.string().min(1)
export type Id = z.infer<typeof Id>

/** ISO 8601 timestamp in UTC (`Z` suffix, no offset). */
export const IsoDateTime = z.iso.datetime()
export type IsoDateTime = z.infer<typeof IsoDateTime>

/** Fields shared by every stored entity. */
export const EntityBase = z.object({
  id: Id,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
})
export type EntityBase = z.infer<typeof EntityBase>

export const TRIAGE_LEVELS = [1, 2, 3, 4, 5] as const
export const TriageLevel = z.literal(TRIAGE_LEVELS)
export type TriageLevel = z.infer<typeof TriageLevel>

export const LOCATION_KINDS = ['BED', 'ED', 'RADIOLOGY', 'OR', 'OTHER'] as const
export const LocationKind = z.enum(LOCATION_KINDS)
export type LocationKind = z.infer<typeof LocationKind>

export const Location = z.object({
  kind: LocationKind,
  refId: Id.optional(),
  label: z.string().min(1),
})
export type Location = z.infer<typeof Location>

/** Who caused an event: a user id or the simulator. */
export const Actor = z.union([z.literal('simulator'), Id])
export type Actor = z.infer<typeof Actor>

/** Short uppercase code, e.g. `CAR` for Cardiología. */
export const Code = z.string().regex(/^[A-Z0-9_-]{2,16}$/)
export type Code = z.infer<typeof Code>

/** Aggregate types an event can belong to (`HospitalEvent.entityType`, `Alert.entityType`). */
export const ENTITY_TYPES = [
  'Specialty',
  'Unit',
  'Bed',
  'Patient',
  'EdVisit',
  'Admission',
  'BedRequest',
  'TransferRequest',
  'Porter',
  'User',
  'Alert',
  'SimulationState',
] as const
export const EntityType = z.enum(ENTITY_TYPES)
export type EntityType = z.infer<typeof EntityType>

/** Event ids are UUIDs (maps to a Postgres `uuid` column). */
export const EventId = z.uuid()
export type EventId = z.infer<typeof EventId>
