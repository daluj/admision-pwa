import { beforeEach, describe, expect, it } from 'vitest'
import { InvalidTransitionError } from '@/domain/state-machines'
import { createCommandHarness, seedMiniHospital, type CommandHarness } from '@/test/commandHarness'
import {
  admitPatient,
  blockBed,
  dischargePatient,
  finishCleaning,
  releaseBedReservation,
  reserveBed,
  startCleaning,
  transferBetweenBeds,
  unblockBed,
} from './beds'
import { decideAdmission, registerEdArrival, startEdAssessment, triageEdPatient } from './ed'
import { InvalidCommandError } from './types'

let h: CommandHarness
let mrn = 1

/** Boarding patient with an OPEN bed request. */
async function boarding(
  options: { isolationRequired?: boolean; requiredUnitType?: 'WARD' | 'ICU' } = {},
) {
  const [arrived] = await h.run(registerEdArrival, {
    patient: {
      data: {
        mrn: `SIM-${mrn++}`,
        firstName: 'Pau',
        lastName: 'Ficticio Prueba',
        sex: 'M',
        birthYear: 1960,
      },
    },
    chiefComplaint: 'Disnea',
  })
  const edVisitId = arrived!.entityId
  await h.run(triageEdPatient, { edVisitId, triageLevel: 3 })
  await h.run(startEdAssessment, { edVisitId })
  const [, requested] = await h.run(decideAdmission, {
    edVisitId,
    targetSpecialtyCode: 'CAR',
    ...options,
  })
  const request = (await h.backend.repositories.bedRequest.get(requested!.entityId))!
  return { edVisitId, requestId: request.id, admissionId: request.admissionId }
}

const bed = (id: string) => h.backend.repositories.bed.get(id)
const admission = (id: string) => h.backend.repositories.admission.get(id)

/** Boarding patient with bed-1 reserved. */
async function reserved() {
  const b = await boarding()
  await h.run(reserveBed, { bedRequestId: b.requestId, bedId: 'bed-1' })
  return b
}

/** Admitted inpatient in bed-1. */
async function inBed() {
  const b = await reserved()
  const a = (await admission(b.admissionId))!
  await h.backend.events.append(
    [],
    [{ entity: 'admission', op: 'put', record: { ...a, status: 'IN_TRANSFER' } }],
  )
  await h.run(admitPatient, { admissionId: b.admissionId })
  return b
}

async function orderDischarge(admissionId: string) {
  const a = (await admission(admissionId))!
  await h.backend.events.append(
    [],
    [{ entity: 'admission', op: 'put', record: { ...a, status: 'DISCHARGE_ORDERED' } }],
  )
}

beforeEach(async () => {
  h = createCommandHarness({ start: '2026-10-21T08:00:00.000Z' })
  await seedMiniHospital(h)
})

describe('reserveBed', () => {
  it('reserves the bed, assigns the request and the admission together', async () => {
    const b = await boarding()
    const [event] = await h.run(reserveBed, {
      bedRequestId: b.requestId,
      bedId: 'bed-1',
      etaAt: '2026-10-21T08:30:00.000Z',
    })
    expect(event).toMatchObject({
      type: 'BedReserved',
      entityType: 'Bed',
      entityId: 'bed-1',
      payload: { bedRequestId: b.requestId, admissionId: b.admissionId },
    })
    expect(await bed('bed-1')).toMatchObject({ status: 'RESERVED', admissionId: b.admissionId })
    expect(await h.backend.repositories.bedRequest.get(b.requestId)).toMatchObject({
      status: 'ASSIGNED',
      assignedBedId: 'bed-1',
      etaAt: '2026-10-21T08:30:00.000Z',
    })
    expect(await admission(b.admissionId)).toMatchObject({ status: 'BED_ASSIGNED', bedId: 'bed-1' })
  })

  it('rejects a bed of the wrong unit type, without isolation, or not free', async () => {
    const ward = await boarding()
    await expect(
      h.run(reserveBed, { bedRequestId: ward.requestId, bedId: 'bed-icu' }),
    ).rejects.toThrow(InvalidCommandError)

    const iso = await boarding({ isolationRequired: true })
    await expect(
      h.run(reserveBed, { bedRequestId: iso.requestId, bedId: 'bed-2' }),
    ).rejects.toThrow(/isolation/)
    await h.run(reserveBed, { bedRequestId: iso.requestId, bedId: 'bed-iso' })

    await expect(
      h.run(reserveBed, { bedRequestId: ward.requestId, bedId: 'bed-iso' }),
    ).rejects.toThrow(InvalidTransitionError)
    expect(await bed('bed-icu')).toMatchObject({ status: 'AVAILABLE' })
  })

  it('rejects a request that is not open', async () => {
    const b = await reserved()
    await expect(h.run(reserveBed, { bedRequestId: b.requestId, bedId: 'bed-2' })).rejects.toThrow(
      /not OPEN/,
    )
  })
})

describe('releaseBedReservation', () => {
  it('frees the bed and reopens the request and admission', async () => {
    const b = await reserved()
    const [event] = await h.run(releaseBedReservation, {
      bedId: 'bed-1',
      reason: 'Cambio de unidad',
    })
    expect(event).toMatchObject({
      type: 'BedReservationReleased',
      payload: { bedRequestId: b.requestId, reason: 'Cambio de unidad' },
    })
    const freed = await bed('bed-1')
    expect(freed).toMatchObject({ status: 'AVAILABLE' })
    expect(freed?.admissionId).toBeUndefined()
    const request = await h.backend.repositories.bedRequest.get(b.requestId)
    expect(request).toMatchObject({ status: 'OPEN' })
    expect(request?.assignedBedId).toBeUndefined()
    const released = await admission(b.admissionId)
    expect(released).toMatchObject({ status: 'AWAITING_BED' })
    expect(released?.bedId).toBeUndefined()
  })

  it('rejects a bed that is not reserved', async () => {
    await expect(h.run(releaseBedReservation, { bedId: 'bed-1' })).rejects.toThrow(
      InvalidTransitionError,
    )
  })
})

describe('admitPatient', () => {
  it('occupies the bed, admits the patient and fulfils the request', async () => {
    const b = await inBed()
    expect(await bed('bed-1')).toMatchObject({ status: 'OCCUPIED', admissionId: b.admissionId })
    expect(await admission(b.admissionId)).toMatchObject({
      status: 'ADMITTED',
      admittedAt: '2026-10-21T08:00:00.000Z',
    })
    expect(await h.backend.repositories.bedRequest.get(b.requestId)).toMatchObject({
      status: 'FULFILLED',
    })
  })

  it('requires the admission to be in transfer', async () => {
    const b = await reserved()
    await expect(h.run(admitPatient, { admissionId: b.admissionId })).rejects.toThrow(
      InvalidTransitionError,
    )
    expect(await bed('bed-1')).toMatchObject({ status: 'RESERVED' })
  })
})

describe('dischargePatient and cleaning', () => {
  it('discharges, then the bed goes through cleaning back to available', async () => {
    const b = await inBed()
    await expect(h.run(dischargePatient, { admissionId: b.admissionId })).rejects.toThrow(
      InvalidTransitionError,
    )
    await orderDischarge(b.admissionId)
    h.clock.advance(60 * 60_000)
    const [discharged] = await h.run(dischargePatient, { admissionId: b.admissionId })
    expect(discharged).toMatchObject({ type: 'PatientDischarged', payload: { bedId: 'bed-1' } })
    expect(await admission(b.admissionId)).toMatchObject({
      status: 'DISCHARGED',
      dischargedAt: '2026-10-21T09:00:00.000Z',
    })
    const dirty = await bed('bed-1')
    expect(dirty).toMatchObject({ status: 'PENDING_CLEANING' })
    expect(dirty?.patientId).toBeUndefined()

    const [started] = await h.run(startCleaning, { bedId: 'bed-1' })
    expect(started!.type).toBe('BedCleaningStarted')
    expect(await bed('bed-1')).toMatchObject({ status: 'CLEANING' })
    const [finished] = await h.run(finishCleaning, { bedId: 'bed-1' })
    expect(finished!.type).toBe('BedCleaningFinished')
    expect(await bed('bed-1')).toMatchObject({ status: 'AVAILABLE' })
  })

  it('rejects finishing cleaning that never started', async () => {
    await expect(h.run(finishCleaning, { bedId: 'bed-1' })).rejects.toThrow(InvalidTransitionError)
    await expect(h.run(startCleaning, { bedId: 'bed-1' })).rejects.toThrow(InvalidTransitionError)
  })
})

describe('blockBed / unblockBed', () => {
  it('blocks with a reason and unblocks', async () => {
    const [blocked] = await h.run(blockBed, { bedId: 'bed-2', reason: 'Avería de oxígeno' })
    expect(blocked).toMatchObject({ type: 'BedBlocked', payload: { reason: 'Avería de oxígeno' } })
    expect(await bed('bed-2')).toMatchObject({
      status: 'BLOCKED',
      blockedReason: 'Avería de oxígeno',
    })

    await h.run(unblockBed, { bedId: 'bed-2' })
    const free = await bed('bed-2')
    expect(free).toMatchObject({ status: 'AVAILABLE' })
    expect(free?.blockedReason).toBeUndefined()
  })

  it('rejects blocking an occupied bed and a block without a reason', async () => {
    await inBed()
    await expect(h.run(blockBed, { bedId: 'bed-1', reason: 'x' })).rejects.toThrow(
      InvalidTransitionError,
    )
    await expect(h.run(blockBed, { bedId: 'bed-2', reason: '  ' })).rejects.toThrow(
      InvalidCommandError,
    )
    await expect(h.run(unblockBed, { bedId: 'bed-2' })).rejects.toThrow(InvalidTransitionError)
  })
})

describe('transferBetweenBeds', () => {
  it('moves the inpatient and sends the old bed to cleaning', async () => {
    const b = await inBed()
    const [event] = await h.run(transferBetweenBeds, {
      admissionId: b.admissionId,
      toBedId: 'bed-2',
    })
    expect(event).toMatchObject({
      type: 'PatientTransferredBetweenBeds',
      payload: { fromBedId: 'bed-1', toBedId: 'bed-2' },
    })
    expect(await bed('bed-1')).toMatchObject({ status: 'PENDING_CLEANING' })
    expect(await bed('bed-2')).toMatchObject({ status: 'OCCUPIED', admissionId: b.admissionId })
    expect(await admission(b.admissionId)).toMatchObject({ status: 'ADMITTED', bedId: 'bed-2' })
  })

  it('rejects an occupied target, the same bed and a patient not in a bed', async () => {
    const b = await inBed()
    await h.run(blockBed, { bedId: 'bed-2', reason: 'x' })
    await expect(
      h.run(transferBetweenBeds, { admissionId: b.admissionId, toBedId: 'bed-2' }),
    ).rejects.toThrow(InvalidTransitionError)
    await expect(
      h.run(transferBetweenBeds, { admissionId: b.admissionId, toBedId: 'bed-1' }),
    ).rejects.toThrow(InvalidCommandError)

    const waiting = await boarding()
    await expect(
      h.run(transferBetweenBeds, { admissionId: waiting.admissionId, toBedId: 'bed-iso' }),
    ).rejects.toThrow(/not in a bed/)
  })
})
