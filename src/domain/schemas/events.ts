import { z } from 'zod'
import { AdmissionCancelReason } from './admission'
import { AlertSeverity } from './alert'
import { BedRequestPriority } from './bedRequest'
import { Actor, Code, EntityType, EventId, Id, IsoDateTime, Location, TriageLevel } from './common'
import { EdArea, EdOutcome } from './edVisit'
import { TransferPriority, TransferReason } from './transferRequest'
import { UnitType } from './unit'

const Empty = z.object({}).strict()

/**
 * Event catalogue: type → aggregate + payload, mirroring `specs/domain.md` → Event payloads.
 * Timestamps not in the payload are the event's `occurredAt`.
 */
const EVENT_DEFINITIONS = {
  EdPatientArrived: {
    entityType: 'EdVisit',
    payload: z.object({ patientId: Id, area: EdArea, chiefComplaint: z.string().min(1) }),
  },
  EdPatientTriaged: {
    entityType: 'EdVisit',
    payload: z.object({ triageLevel: TriageLevel, area: EdArea.optional() }),
  },
  EdAssessmentStarted: { entityType: 'EdVisit', payload: Empty },
  AdmissionDecided: {
    entityType: 'EdVisit',
    payload: z.object({ admissionId: Id, targetSpecialtyCode: Code }),
  },
  EdPatientLeft: { entityType: 'EdVisit', payload: z.object({ outcome: EdOutcome }) },
  ScheduledAdmissionCreated: {
    entityType: 'Admission',
    payload: z.object({ patientId: Id, specialtyCode: Code, scheduledFor: IsoDateTime }),
  },
  BedRequested: {
    entityType: 'BedRequest',
    payload: z.object({
      admissionId: Id,
      priority: BedRequestPriority,
      requiredUnitType: UnitType,
      preferredSpecialtyCode: Code,
      isolationRequired: z.boolean(),
    }),
  },
  BedReserved: {
    entityType: 'Bed',
    payload: z.object({ bedRequestId: Id, admissionId: Id, etaAt: IsoDateTime.optional() }),
  },
  BedReservationReleased: {
    entityType: 'Bed',
    payload: z.object({ bedRequestId: Id.optional(), reason: z.string().min(1).optional() }),
  },
  PatientAdmitted: { entityType: 'Admission', payload: z.object({ patientId: Id, bedId: Id }) },
  ExpectedDischargeSet: {
    entityType: 'Admission',
    payload: z.object({ expectedDischargeAt: IsoDateTime }),
  },
  DischargeOrdered: { entityType: 'Admission', payload: Empty },
  PatientDischarged: { entityType: 'Admission', payload: z.object({ bedId: Id }) },
  PatientTransferredBetweenBeds: {
    entityType: 'Admission',
    payload: z.object({ fromBedId: Id, toBedId: Id }),
  },
  BedCleaningStarted: { entityType: 'Bed', payload: Empty },
  BedCleaningFinished: { entityType: 'Bed', payload: Empty },
  BedBlocked: { entityType: 'Bed', payload: z.object({ reason: z.string().min(1) }) },
  BedUnblocked: { entityType: 'Bed', payload: Empty },
  TransferRequested: {
    entityType: 'TransferRequest',
    payload: z.object({
      patientId: Id,
      fromLocation: Location,
      toLocation: Location,
      reason: TransferReason,
      priority: TransferPriority,
      slaDueAt: IsoDateTime,
    }),
  },
  TransferAssigned: { entityType: 'TransferRequest', payload: z.object({ porterId: Id }) },
  TransferPickedUp: { entityType: 'TransferRequest', payload: Empty },
  TransferDelivered: { entityType: 'TransferRequest', payload: Empty },
  TransferCancelled: {
    entityType: 'TransferRequest',
    payload: z.object({ reason: z.string().min(1).optional() }),
  },
  AdmissionCancelled: {
    entityType: 'Admission',
    payload: z.object({ reason: AdmissionCancelReason }),
  },
  AlertRaised: {
    entityType: 'Alert',
    payload: z.object({
      ruleId: z.string().min(1),
      severity: AlertSeverity,
      entityType: EntityType,
      entityId: Id,
      message: z.string().min(1),
    }),
  },
  AlertAcknowledged: { entityType: 'Alert', payload: z.object({ acknowledgedBy: Id }) },
  AlertResolved: { entityType: 'Alert', payload: Empty },
} as const satisfies Record<string, { entityType: EntityType; payload: z.ZodObject }>

type EventDefinitions = typeof EVENT_DEFINITIONS
export type EventType = keyof EventDefinitions

export const EVENT_TYPES = Object.keys(EVENT_DEFINITIONS) as EventType[]

const NewEventBase = z.object({
  id: EventId,
  occurredAt: IsoDateTime,
  actor: Actor,
  entityId: Id,
})

function eventSchema<T extends EventType>(type: T) {
  const definition: EventDefinitions[T] = EVENT_DEFINITIONS[type]
  return NewEventBase.extend({
    type: z.literal(type),
    entityType: z.literal(definition.entityType as EventDefinitions[T]['entityType']),
    payload: definition.payload as EventDefinitions[T]['payload'],
  })
}

type NewEventSchemas = { [T in EventType]: ReturnType<typeof eventSchema<T>> }

const newEventSchemas = Object.fromEntries(
  EVENT_TYPES.map((type) => [type, eventSchema(type)]),
) as NewEventSchemas

type SchemaTuple = [NewEventSchemas[EventType], ...NewEventSchemas[EventType][]]

/** An event as produced by a command, before the event store assigns `seq`. */
export const NewHospitalEvent = z.discriminatedUnion(
  'type',
  Object.values(newEventSchemas) as SchemaTuple,
)
export type NewHospitalEvent = z.infer<typeof NewHospitalEvent>

/** Sequence number assigned by the event store: monotonic, gap-free, starting at 1. */
export const EventSeq = z.int().positive()

/** A stored event. */
export const HospitalEvent = NewHospitalEvent.and(z.object({ seq: EventSeq }))
export type HospitalEvent = NewHospitalEvent & { seq: number }

/** Narrow a stored or new event to one type. */
export type EventOfType<T extends EventType, E extends NewHospitalEvent = HospitalEvent> = Extract<
  E,
  { type: T }
>

/** The aggregate type each event belongs to. */
export function entityTypeOf(type: EventType): EntityType {
  return EVENT_DEFINITIONS[type].entityType
}
