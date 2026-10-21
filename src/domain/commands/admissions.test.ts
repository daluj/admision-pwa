import { beforeEach, describe, expect, it } from 'vitest'
import { InvalidTransitionError } from '@/domain/state-machines'
import { createCommandHarness, seedMiniHospital, type CommandHarness } from '@/test/commandHarness'
import {
  cancelAdmission,
  createScheduledAdmission,
  orderDischarge,
  requestBedForScheduled,
  setExpectedDischarge,
} from './admissions'
import { admitPatient, reserveBed } from './beds'
import { InvalidCommandError } from './types'

let h: CommandHarness
let mrn = 1

const DATA = (): {
  mrn: string
  firstName: string
  lastName: string
  sex: 'F'
  birthYear: number
} => ({
  mrn: `SIM-${mrn++}`,
  firstName: 'Eva',
  lastName: 'Ficticia Prueba',
  sex: 'F',
  birthYear: 1980,
})
const SCHEDULED_FOR = '2026-10-21T10:00:00.000Z'

async function scheduled() {
  const [event] = await h.run(createScheduledAdmission, {
    patient: { data: DATA() },
    specialtyCode: 'CAR',
    scheduledFor: SCHEDULED_FOR,
  })
  return event!.entityId
}

async function awaitingBed() {
  const admissionId = await scheduled()
  const [event] = await h.run(requestBedForScheduled, { admissionId })
  return { admissionId, requestId: event!.entityId }
}

beforeEach(async () => {
  h = createCommandHarness({ start: '2026-10-21T08:00:00.000Z' })
  await seedMiniHospital(h)
})

describe('createScheduledAdmission', () => {
  it('creates the patient and a SCHEDULED admission', async () => {
    const [event] = await h.run(createScheduledAdmission, {
      patient: { data: DATA() },
      specialtyCode: 'CAR',
      scheduledFor: SCHEDULED_FOR,
    })
    expect(event).toMatchObject({
      type: 'ScheduledAdmissionCreated',
      entityType: 'Admission',
      payload: { specialtyCode: 'CAR', scheduledFor: SCHEDULED_FOR },
    })
    expect(await h.backend.repositories.admission.get(event!.entityId)).toMatchObject({
      type: 'SCHEDULED',
      status: 'SCHEDULED',
      scheduledFor: SCHEDULED_FOR,
    })
    expect(await h.backend.repositories.patient.count()).toBe(1)
  })

  it('rejects an unknown specialty', async () => {
    await expect(
      h.run(createScheduledAdmission, {
        patient: { data: DATA() },
        specialtyCode: 'ZZZ',
        scheduledFor: SCHEDULED_FOR,
      }),
    ).rejects.toThrow(InvalidCommandError)
    expect(await h.backend.repositories.patient.count()).toBe(0)
  })
})

describe('requestBedForScheduled', () => {
  it('moves the admission to AWAITING_BED with an OPEN P2 request', async () => {
    const { admissionId, requestId } = await awaitingBed()
    expect(await h.backend.repositories.admission.get(admissionId)).toMatchObject({
      status: 'AWAITING_BED',
    })
    expect(await h.backend.repositories.bedRequest.get(requestId)).toMatchObject({
      status: 'OPEN',
      priority: 'P2',
      preferredSpecialtyCode: 'CAR',
      requiredUnitType: 'WARD',
    })
  })

  it('rejects asking twice and urgent admissions', async () => {
    const { admissionId } = await awaitingBed()
    await expect(h.run(requestBedForScheduled, { admissionId })).rejects.toThrow(
      InvalidTransitionError,
    )
  })
})

describe('cancelAdmission', () => {
  it('cancels a scheduled admission', async () => {
    const admissionId = await scheduled()
    const [event] = await h.run(cancelAdmission, { admissionId, reason: 'PATIENT' })
    expect(event).toMatchObject({ type: 'AdmissionCancelled', payload: { reason: 'PATIENT' } })
    expect(await h.backend.repositories.admission.get(admissionId)).toMatchObject({
      status: 'CANCELLED',
    })
  })

  it('cancels the open request when waiting for a bed', async () => {
    const { admissionId, requestId } = await awaitingBed()
    const events = await h.run(cancelAdmission, { admissionId, reason: 'NO_BED' })
    expect(events.map((e) => e.type)).toEqual(['AdmissionCancelled'])
    expect(await h.backend.repositories.bedRequest.get(requestId)).toMatchObject({
      status: 'CANCELLED',
    })
  })

  it('releases a reserved bed', async () => {
    const { admissionId, requestId } = await awaitingBed()
    await h.run(reserveBed, { bedRequestId: requestId, bedId: 'bed-1' })
    const events = await h.run(cancelAdmission, { admissionId, reason: 'NO_BED' })
    expect(events.map((e) => e.type)).toEqual(['AdmissionCancelled', 'BedReservationReleased'])
    const bed = await h.backend.repositories.bed.get('bed-1')
    expect(bed).toMatchObject({ status: 'AVAILABLE' })
    expect(bed?.admissionId).toBeUndefined()
    const admission = await h.backend.repositories.admission.get(admissionId)
    expect(admission?.bedId).toBeUndefined()
  })

  it('cannot cancel an admission already in a bed', async () => {
    const { admissionId, requestId } = await awaitingBed()
    await h.run(reserveBed, { bedRequestId: requestId, bedId: 'bed-1' })
    const a = (await h.backend.repositories.admission.get(admissionId))!
    await h.backend.events.append(
      [],
      [{ entity: 'admission', op: 'put', record: { ...a, status: 'IN_TRANSFER' } }],
    )
    await expect(h.run(cancelAdmission, { admissionId, reason: 'OTHER' })).rejects.toThrow(
      InvalidTransitionError,
    )
  })
})

describe('setExpectedDischarge and orderDischarge', () => {
  async function admitted() {
    const { admissionId, requestId } = await awaitingBed()
    await h.run(reserveBed, { bedRequestId: requestId, bedId: 'bed-1' })
    const a = (await h.backend.repositories.admission.get(admissionId))!
    await h.backend.events.append(
      [],
      [{ entity: 'admission', op: 'put', record: { ...a, status: 'IN_TRANSFER' } }],
    )
    await h.run(admitPatient, { admissionId })
    return admissionId
  }

  it('sets the expected discharge only for inpatients', async () => {
    const waiting = (await awaitingBed()).admissionId
    await expect(
      h.run(setExpectedDischarge, {
        admissionId: waiting,
        expectedDischargeAt: '2026-10-22T10:00:00.000Z',
      }),
    ).rejects.toThrow(InvalidCommandError)

    const admissionId = await admitted()
    const [event] = await h.run(setExpectedDischarge, {
      admissionId,
      expectedDischargeAt: '2026-10-22T10:00:00.000Z',
    })
    expect(event).toMatchObject({
      type: 'ExpectedDischargeSet',
      payload: { expectedDischargeAt: '2026-10-22T10:00:00.000Z' },
    })
    expect(await h.backend.repositories.admission.get(admissionId)).toMatchObject({
      expectedDischargeAt: '2026-10-22T10:00:00.000Z',
    })
  })

  it('orders the discharge once and records the time', async () => {
    const admissionId = await admitted()
    h.clock.advance(3_600_000)
    const [event] = await h.run(orderDischarge, { admissionId })
    expect(event!.type).toBe('DischargeOrdered')
    expect(await h.backend.repositories.admission.get(admissionId)).toMatchObject({
      status: 'DISCHARGE_ORDERED',
      dischargeOrderedAt: '2026-10-21T09:00:00.000Z',
    })
    await expect(h.run(orderDischarge, { admissionId })).rejects.toThrow(InvalidTransitionError)
  })
})
