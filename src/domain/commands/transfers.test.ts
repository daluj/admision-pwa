import { beforeEach, describe, expect, it } from 'vitest'
import { InvalidTransitionError } from '@/domain/state-machines'
import { createCommandHarness, seedMiniHospital, type CommandHarness } from '@/test/commandHarness'
import { reserveBed } from './beds'
import { decideAdmission, registerEdArrival, startEdAssessment, triageEdPatient } from './ed'
import {
  assignTransfer,
  cancelTransfer,
  deliverTransfer,
  pickUpTransfer,
  requestTransfer,
  TRANSFER_SLA_MINUTES,
} from './transfers'
import { InvalidCommandError } from './types'

let h: CommandHarness
let mrn = 1

async function patientId() {
  const [event] = await h.run(registerEdArrival, {
    patient: {
      data: {
        mrn: `SIM-${mrn++}`,
        firstName: 'Leo',
        lastName: 'Ficticio Prueba',
        sex: 'M',
        birthYear: 1955,
      },
    },
    chiefComplaint: 'Dolor',
  })
  return (await h.backend.repositories.edVisit.get(event!.entityId))!.patientId
}

const RADIOLOGY = { kind: 'RADIOLOGY', label: 'Radiología' } as const
const ED = { kind: 'ED', label: 'Urgencias' } as const

async function requested(priority: 'URGENT' | 'NORMAL' = 'NORMAL') {
  const pid = await patientId()
  const [event] = await h.run(requestTransfer, {
    patientId: pid,
    fromLocation: ED,
    toLocation: RADIOLOGY,
    reason: 'TEST',
    priority,
  })
  return event!.entityId
}

const transfer = (id: string) => h.backend.repositories.transferRequest.get(id)
const porter = () => h.backend.repositories.porter.get('por-1')

beforeEach(async () => {
  h = createCommandHarness({ start: '2026-10-21T08:00:00.000Z' })
  await seedMiniHospital(h)
})

describe('requestTransfer', () => {
  it.each(['URGENT', 'NORMAL'] as const)('sets the %s pickup SLA', async (priority) => {
    const id = await requested(priority)
    const t = await transfer(id)
    expect(t).toMatchObject({ status: 'REQUESTED', priority })
    expect(Date.parse(t!.slaDueAt) - Date.parse(t!.requestedAt)).toBe(
      TRANSFER_SLA_MINUTES[priority] * 60_000,
    )
  })

  it('rejects an unknown patient', async () => {
    await expect(
      h.run(requestTransfer, {
        patientId: 'nope',
        fromLocation: ED,
        toLocation: RADIOLOGY,
        reason: 'TEST',
        priority: 'NORMAL',
      }),
    ).rejects.toThrow(InvalidCommandError)
  })
})

describe('transfer life cycle', () => {
  it('assigns, picks up and delivers, keeping the porter status in step', async () => {
    const id = await requested()
    h.clock.advance(5 * 60_000)
    const [assigned] = await h.run(assignTransfer, { transferId: id, porterId: 'por-1' })
    expect(assigned).toMatchObject({ type: 'TransferAssigned', payload: { porterId: 'por-1' } })
    expect(await transfer(id)).toMatchObject({ status: 'ASSIGNED', porterId: 'por-1' })
    expect(await porter()).toMatchObject({ status: 'BUSY' })

    h.clock.advance(5 * 60_000)
    await h.run(pickUpTransfer, { transferId: id })
    expect(await transfer(id)).toMatchObject({
      status: 'PICKED_UP',
      pickedUpAt: '2026-10-21T08:10:00.000Z',
    })

    h.clock.advance(10 * 60_000)
    await h.run(deliverTransfer, { transferId: id })
    expect(await transfer(id)).toMatchObject({
      status: 'DELIVERED',
      deliveredAt: '2026-10-21T08:20:00.000Z',
    })
    expect(await porter()).toMatchObject({ status: 'AVAILABLE' })
  })

  it('rejects skipping steps and assigning a busy porter', async () => {
    const id = await requested()
    await expect(h.run(pickUpTransfer, { transferId: id })).rejects.toThrow(InvalidTransitionError)
    await expect(h.run(deliverTransfer, { transferId: id })).rejects.toThrow(InvalidTransitionError)
    await h.run(assignTransfer, { transferId: id, porterId: 'por-1' })

    const other = await requested()
    await expect(h.run(assignTransfer, { transferId: other, porterId: 'por-1' })).rejects.toThrow(
      /not AVAILABLE/,
    )
    expect(await transfer(other)).toMatchObject({ status: 'REQUESTED' })
  })

  it('cancels before pickup and frees the porter; not after', async () => {
    const id = await requested()
    await h.run(assignTransfer, { transferId: id, porterId: 'por-1' })
    const [event] = await h.run(cancelTransfer, {
      transferId: id,
      reason: 'Paciente no disponible',
    })
    expect(event).toMatchObject({
      type: 'TransferCancelled',
      payload: { reason: 'Paciente no disponible' },
    })
    expect(await transfer(id)).toMatchObject({ status: 'CANCELLED' })
    expect(await porter()).toMatchObject({ status: 'AVAILABLE' })

    const picked = await requested()
    await h.run(assignTransfer, { transferId: picked, porterId: 'por-1' })
    await h.run(pickUpTransfer, { transferId: picked })
    await expect(h.run(cancelTransfer, { transferId: picked })).rejects.toThrow(
      InvalidTransitionError,
    )
  })

  it('moves the admission to IN_TRANSFER when the patient is picked up for a reserved bed', async () => {
    const [arrived] = await h.run(registerEdArrival, {
      patient: {
        data: {
          mrn: 'SIM-2',
          firstName: 'Mar',
          lastName: 'Ficticia Prueba',
          sex: 'F',
          birthYear: 1990,
        },
      },
      chiefComplaint: 'Fiebre',
    })
    const edVisitId = arrived!.entityId
    await h.run(triageEdPatient, { edVisitId, triageLevel: 3 })
    await h.run(startEdAssessment, { edVisitId })
    const [, requestEvent] = await h.run(decideAdmission, { edVisitId, targetSpecialtyCode: 'CAR' })
    const request = (await h.backend.repositories.bedRequest.get(requestEvent!.entityId))!
    await h.run(reserveBed, { bedRequestId: request.id, bedId: 'bed-1' })
    const visit = (await h.backend.repositories.edVisit.get(edVisitId))!

    const [event] = await h.run(requestTransfer, {
      patientId: visit.patientId,
      fromLocation: ED,
      toLocation: { kind: 'BED', refId: 'bed-1', label: 'bed-1' },
      reason: 'ADMISSION',
      priority: 'NORMAL',
    })
    await h.run(assignTransfer, { transferId: event!.entityId, porterId: 'por-1' })
    await h.run(pickUpTransfer, { transferId: event!.entityId })
    expect(await h.backend.repositories.admission.get(request.admissionId)).toMatchObject({
      status: 'IN_TRANSFER',
    })
  })
})
