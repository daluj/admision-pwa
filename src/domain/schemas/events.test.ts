import { describe, expect, it } from 'vitest'
import {
  entityTypeOf,
  EVENT_TYPES,
  HospitalEvent,
  NewHospitalEvent,
  type EventType,
} from './events'

const loc = { kind: 'ED', label: 'Urgencias' } as const

/** A valid payload for every event type, matching specs/domain.md → Event payloads. */
const validPayloads: Record<EventType, Record<string, unknown>> = {
  EdPatientArrived: { patientId: 'pat-1', area: 'WAITING_ROOM', chiefComplaint: 'Disnea' },
  EdPatientTriaged: { triageLevel: 3 },
  EdAssessmentStarted: {},
  AdmissionDecided: { admissionId: 'adm-1', targetSpecialtyCode: 'CAR' },
  EdPatientLeft: { outcome: 'ADMITTED' },
  ScheduledAdmissionCreated: {
    patientId: 'pat-1',
    specialtyCode: 'CGD',
    scheduledFor: '2026-10-21T07:00:00Z',
  },
  BedRequested: {
    admissionId: 'adm-1',
    priority: 'P2',
    requiredUnitType: 'WARD',
    preferredSpecialtyCode: 'CAR',
    isolationRequired: false,
  },
  BedReserved: { bedRequestId: 'breq-1', admissionId: 'adm-1' },
  BedReservationReleased: {},
  PatientAdmitted: { patientId: 'pat-1', bedId: 'bed-1' },
  ExpectedDischargeSet: { expectedDischargeAt: '2026-10-22T10:00:00Z' },
  DischargeOrdered: {},
  PatientDischarged: { bedId: 'bed-1' },
  PatientTransferredBetweenBeds: { fromBedId: 'bed-1', toBedId: 'bed-2' },
  BedCleaningStarted: {},
  BedCleaningFinished: {},
  BedBlocked: { reason: 'Avería' },
  BedUnblocked: {},
  TransferRequested: {
    patientId: 'pat-1',
    fromLocation: loc,
    toLocation: { kind: 'BED', refId: 'bed-1', label: '512-A' },
    reason: 'ADMISSION',
    priority: 'URGENT',
    slaDueAt: '2026-10-20T08:10:00Z',
  },
  TransferAssigned: { porterId: 'por-1' },
  TransferPickedUp: {},
  TransferDelivered: {},
  TransferCancelled: {},
  AdmissionCancelled: { reason: 'NO_BED' },
  AlertRaised: {
    ruleId: 'BOARDING_LONG',
    severity: 'WARNING',
    entityType: 'EdVisit',
    entityId: 'edv-1',
    message: 'Boarding > 4 h',
  },
  AlertAcknowledged: { acknowledgedBy: 'usr-1' },
  AlertResolved: {},
  DemoSeeded: {
    seed: 42,
    profileId: 'tertiary-600',
    anchorAt: '2026-10-20T06:00:00.000Z',
    counts: { bed: 600, patient: 550 },
  },
  SimulationStarted: {},
  SimulationPaused: {},
  SimulationSpeedChanged: { speed: 60 },
}

function makeEvent(type: EventType, payload: Record<string, unknown> = validPayloads[type]) {
  return {
    id: crypto.randomUUID(),
    type,
    occurredAt: '2026-10-20T08:00:00.000Z',
    actor: 'simulator',
    entityType: entityTypeOf(type),
    entityId: 'entity-1',
    payload,
  }
}

describe('event schemas', () => {
  it('cover the 31 events of specs/domain.md', () => {
    expect(EVENT_TYPES).toHaveLength(31)
  })

  it.each(EVENT_TYPES)('%s parses with a valid payload', (type) => {
    expect(NewHospitalEvent.safeParse(makeEvent(type)).success).toBe(true)
    expect(HospitalEvent.safeParse({ ...makeEvent(type), seq: 1 }).success).toBe(true)
  })

  it('AlertRaised accepts string and number params and rejects anything else', () => {
    const base = {
      id: '00000000-0000-4000-8000-000000000001',
      type: 'AlertRaised',
      occurredAt: '2026-10-21T10:00:00.000Z',
      actor: 'simulator',
      entityType: 'Alert',
      entityId: 'alr-1',
    }
    const payload = { ...validPayloads.AlertRaised, params: { initials: 'M. G.', minutes: 12 } }
    expect(NewHospitalEvent.safeParse({ ...base, payload }).success).toBe(true)
    const bad = { ...validPayloads.AlertRaised, params: { nested: { a: 1 } } }
    expect(NewHospitalEvent.safeParse({ ...base, payload: bad }).success).toBe(false)
  })

  it('rejects a payload that belongs to another type', () => {
    const event = makeEvent('PatientDischarged', validPayloads.TransferAssigned)
    expect(NewHospitalEvent.safeParse(event).success).toBe(false)
  })

  it('rejects extra fields on an empty payload', () => {
    expect(NewHospitalEvent.safeParse(makeEvent('DischargeOrdered', { x: 1 })).success).toBe(false)
  })

  it('rejects an unknown type and a wrong entityType', () => {
    expect(
      NewHospitalEvent.safeParse({ ...makeEvent('BedBlocked'), type: 'BedExploded' }).success,
    ).toBe(false)
    expect(
      NewHospitalEvent.safeParse({ ...makeEvent('BedBlocked'), entityType: 'Admission' }).success,
    ).toBe(false)
  })

  it('requires a positive integer seq on stored events', () => {
    expect(HospitalEvent.safeParse(makeEvent('BedUnblocked')).success).toBe(false)
    expect(HospitalEvent.safeParse({ ...makeEvent('BedUnblocked'), seq: 0 }).success).toBe(false)
  })

  it('rejects an invalid DemoSeeded payload', () => {
    for (const payload of [
      { ...validPayloads.DemoSeeded, seed: -1 },
      { ...validPayloads.DemoSeeded, counts: { bed: 1.5 } },
      { ...validPayloads.DemoSeeded, anchorAt: '2026-10-20 08:00' },
    ]) {
      expect(NewHospitalEvent.safeParse(makeEvent('DemoSeeded', payload)).success).toBe(false)
    }
  })

  it('only accepts the supported simulation speeds', () => {
    expect(
      NewHospitalEvent.safeParse(makeEvent('SimulationSpeedChanged', { speed: 60 })).success,
    ).toBe(true)
    expect(
      NewHospitalEvent.safeParse(makeEvent('SimulationSpeedChanged', { speed: 7 })).success,
    ).toBe(false)
  })

  it('requires a UUID event id', () => {
    expect(NewHospitalEvent.safeParse({ ...makeEvent('BedUnblocked'), id: 'evt-1' }).success).toBe(
      false,
    )
  })

  it('rejects a non-UTC occurredAt', () => {
    const event = { ...makeEvent('BedUnblocked'), occurredAt: '2026-10-20T10:00:00+02:00' }
    expect(NewHospitalEvent.safeParse(event).success).toBe(false)
  })
})
