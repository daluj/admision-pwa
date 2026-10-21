import { beforeEach, describe, expect, it } from 'vitest'
import { InvalidTransitionError } from '@/domain/state-machines'
import { createCommandHarness, seedMiniHospital, type CommandHarness } from '@/test/commandHarness'
import {
  decideAdmission,
  registerEdArrival,
  registerEdDeparture,
  startEdAssessment,
  triageEdPatient,
} from './ed'
import { InvalidCommandError } from './types'

const PATIENT = {
  mrn: 'SIM-900001',
  firstName: 'Ana',
  lastName: 'Ficticia Prueba',
  sex: 'F',
  birthYear: 1970,
} as const

let h: CommandHarness

let mrnCounter = 900001

async function arrive() {
  const [event] = await h.run(registerEdArrival, {
    patient: { data: { ...PATIENT, mrn: `SIM-${mrnCounter++}` } },
    chiefComplaint: 'Disnea',
  })
  return event!.entityId
}

beforeEach(async () => {
  h = createCommandHarness({ start: '2026-10-21T08:00:00.000Z' })
  await seedMiniHospital(h)
})

describe('registerEdArrival', () => {
  it('creates the patient and the visit and emits EdPatientArrived', async () => {
    const [event] = await h.run(registerEdArrival, {
      patient: { data: PATIENT },
      chiefComplaint: 'Disnea',
    })
    expect(event).toMatchObject({ type: 'EdPatientArrived', entityType: 'EdVisit' })
    const visit = await h.backend.repositories.edVisit.get(event!.entityId)
    expect(visit).toMatchObject({
      phase: 'ARRIVED',
      area: 'WAITING_ROOM',
      arrivedAt: '2026-10-21T08:00:00.000Z',
      chiefComplaint: 'Disnea',
    })
    const patient = await h.backend.repositories.patient.get(visit!.patientId)
    expect(patient?.mrn).toBe('SIM-900001')
  })

  it('reuses an existing patient and rejects an unknown one', async () => {
    const id = await arrive()
    const visit = await h.backend.repositories.edVisit.get(id)
    await h.run(registerEdArrival, {
      patient: { patientId: visit!.patientId },
      chiefComplaint: 'Fiebre',
    })
    expect(await h.backend.repositories.patient.count()).toBe(1)
    await expect(
      h.run(registerEdArrival, { patient: { patientId: 'nope' }, chiefComplaint: 'x' }),
    ).rejects.toThrow(InvalidCommandError)
  })
})

describe('triage and assessment', () => {
  it('sets level and time; moves L1 to resus and L2 to boxes, keeps L3 in the waiting room', async () => {
    const [l1, l2, l3] = [await arrive(), await arrive(), await arrive()] as [
      string,
      string,
      string,
    ]
    h.clock.advance(5 * 60_000)
    const e1 = await h.run(triageEdPatient, { edVisitId: l1, triageLevel: 1 })
    await h.run(triageEdPatient, { edVisitId: l2, triageLevel: 2 })
    await h.run(triageEdPatient, { edVisitId: l3, triageLevel: 3 })
    expect(e1[0]).toMatchObject({
      type: 'EdPatientTriaged',
      payload: { triageLevel: 1, area: 'RESUS' },
    })

    const get = (id: string) => h.backend.repositories.edVisit.get(id)
    expect(await get(l1)).toMatchObject({
      phase: 'TRIAGED',
      area: 'RESUS',
      triagedAt: '2026-10-21T08:05:00.000Z',
    })
    expect(await get(l2)).toMatchObject({ area: 'BOXES' })
    expect(await get(l3)).toMatchObject({ area: 'WAITING_ROOM', triageLevel: 3 })
  })

  it('rejects an L1/L2 patient in the waiting room and a double triage', async () => {
    const id = await arrive()
    await expect(
      h.run(triageEdPatient, { edVisitId: id, triageLevel: 2, area: 'WAITING_ROOM' }),
    ).rejects.toThrow(InvalidCommandError)
    await h.run(triageEdPatient, { edVisitId: id, triageLevel: 4 })
    await expect(h.run(triageEdPatient, { edVisitId: id, triageLevel: 4 })).rejects.toThrow(
      InvalidTransitionError,
    )
  })

  it('starts the assessment only after triage and moves the patient to a box', async () => {
    const id = await arrive()
    await expect(h.run(startEdAssessment, { edVisitId: id })).rejects.toThrow(
      InvalidTransitionError,
    )
    await h.run(triageEdPatient, { edVisitId: id, triageLevel: 3 })
    h.clock.advance(30 * 60_000)
    await h.run(startEdAssessment, { edVisitId: id })
    expect(await h.backend.repositories.edVisit.get(id)).toMatchObject({
      phase: 'IN_ASSESSMENT',
      area: 'BOXES',
      seenAt: '2026-10-21T08:30:00.000Z',
    })
  })
})

describe('decideAdmission', () => {
  async function inAssessment(level: 2 | 3 | 5 = 3) {
    const id = await arrive()
    await h.run(triageEdPatient, { edVisitId: id, triageLevel: level })
    await h.run(startEdAssessment, { edVisitId: id })
    return id
  }

  it('makes the visit boarding and creates an URGENT admission and an OPEN bed request', async () => {
    const id = await inAssessment(2)
    const events = await h.run(decideAdmission, { edVisitId: id, targetSpecialtyCode: 'CAR' })
    expect(events.map((e) => e.type)).toEqual(['AdmissionDecided', 'BedRequested'])

    const visit = await h.backend.repositories.edVisit.get(id)
    expect(visit).toMatchObject({ phase: 'ADMIT_DECISION', targetSpecialtyCode: 'CAR' })
    expect(visit?.admitDecisionAt).toBe('2026-10-21T08:00:00.000Z')

    const [admission] = await h.backend.repositories.admission.list()
    expect(admission).toMatchObject({
      type: 'URGENT',
      status: 'AWAITING_BED',
      edVisitId: id,
      specialtyCode: 'CAR',
    })
    const [request] = await h.backend.repositories.bedRequest.list()
    expect(request).toMatchObject({
      admissionId: admission!.id,
      status: 'OPEN',
      priority: 'P1',
      requiredUnitType: 'WARD',
    })
    expect(events[0]!.payload).toMatchObject({ admissionId: admission!.id })
    expect(events[1]!.entityId).toBe(request!.id)
  })

  it('maps triage level to bed request priority', async () => {
    const id = await inAssessment(5)
    await h.run(decideAdmission, {
      edVisitId: id,
      targetSpecialtyCode: 'CAR',
      requiredUnitType: 'ICU',
    })
    const [request] = await h.backend.repositories.bedRequest.list()
    expect(request).toMatchObject({ priority: 'P3', requiredUnitType: 'ICU' })
  })

  it('rejects an unknown specialty and a visit that is not in assessment', async () => {
    const id = await arrive()
    await expect(
      h.run(decideAdmission, { edVisitId: id, targetSpecialtyCode: 'CAR' }),
    ).rejects.toThrow(InvalidTransitionError)
    const assessed = await inAssessment()
    await expect(
      h.run(decideAdmission, { edVisitId: assessed, targetSpecialtyCode: 'ZZZ' }),
    ).rejects.toThrow(InvalidCommandError)
    expect(await h.backend.repositories.admission.count()).toBe(0)
  })
})

describe('registerEdDeparture', () => {
  it('lets a treated patient go home and records the end', async () => {
    const id = await arrive()
    await h.run(triageEdPatient, { edVisitId: id, triageLevel: 4 })
    await h.run(startEdAssessment, { edVisitId: id })
    h.clock.advance(60 * 60_000)
    const [event] = await h.run(registerEdDeparture, { edVisitId: id, outcome: 'DISCHARGED_HOME' })
    expect(event).toMatchObject({ type: 'EdPatientLeft', payload: { outcome: 'DISCHARGED_HOME' } })
    expect(await h.backend.repositories.edVisit.get(id)).toMatchObject({
      phase: 'LEFT_ED',
      outcome: 'DISCHARGED_HOME',
      endedAt: '2026-10-21T09:00:00.000Z',
    })
  })

  it('allows LWBS only before assessment and rejects other outcomes from the waiting room', async () => {
    const id = await arrive()
    await expect(
      h.run(registerEdDeparture, { edVisitId: id, outcome: 'DISCHARGED_HOME' }),
    ).rejects.toThrow(InvalidTransitionError)
    await h.run(registerEdDeparture, { edVisitId: id, outcome: 'LWBS' })
    await expect(h.run(registerEdDeparture, { edVisitId: id, outcome: 'LWBS' })).rejects.toThrow(
      InvalidTransitionError,
    )
  })

  it('only lets a boarding patient leave as ADMITTED once the admission is in a bed', async () => {
    const id = await arrive()
    await h.run(triageEdPatient, { edVisitId: id, triageLevel: 3 })
    await h.run(startEdAssessment, { edVisitId: id })
    await h.run(decideAdmission, { edVisitId: id, targetSpecialtyCode: 'CAR' })
    await expect(
      h.run(registerEdDeparture, { edVisitId: id, outcome: 'ADMITTED' }),
    ).rejects.toThrow(InvalidCommandError)

    const [admission] = await h.backend.repositories.admission.list()
    await h.backend.events.append(
      [],
      [
        {
          entity: 'admission',
          op: 'put',
          record: { ...admission!, status: 'ADMITTED', bedId: 'bed-1' },
        },
      ],
    )
    await h.run(registerEdDeparture, { edVisitId: id, outcome: 'ADMITTED' })
    expect(await h.backend.repositories.edVisit.get(id)).toMatchObject({ outcome: 'ADMITTED' })
  })
})
