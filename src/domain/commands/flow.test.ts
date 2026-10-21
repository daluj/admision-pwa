import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { executeCommand } from '@/domain/commands/execute'
import { ensureDemoSeeded } from '@/simulator/seed/seedDemo'
import { readState, stateViolations } from '@/simulator/stateInvariants'
import { counterIds } from '@/test/commandHarness'
import { orderDischarge } from './admissions'
import { admitPatient, dischargePatient, finishCleaning, reserveBed, startCleaning } from './beds'
import {
  decideAdmission,
  registerEdArrival,
  registerEdDeparture,
  startEdAssessment,
  triageEdPatient,
} from './ed'
import { assignTransfer, deliverTransfer, pickUpTransfer } from './transfers'

describe('full patient flow on the seeded hospital', () => {
  it('ED arrival → … → discharge → cleaning keeps every link consistent', async () => {
    const clock = createFixedClock('2026-10-21T08:00:00.000Z')
    const backend = createMemoryBackend({ clock })
    await ensureDemoSeeded(backend, 42)
    const deps = { backend, clock, newId: counterIds(5000) }
    const run = <I>(command: Parameters<typeof executeCommand<I>>[1], input: I) =>
      executeCommand(deps, command, input)
    const step = async (minutes: number) => {
      clock.advance(minutes * 60_000)
      expect(stateViolations(await readState(backend))).toEqual([])
    }

    const [arrived] = await run(registerEdArrival, {
      patient: {
        data: {
          mrn: 'SIM-777777',
          firstName: 'Iker',
          lastName: 'Ficticio Prueba',
          sex: 'M',
          birthYear: 1948,
        },
      },
      chiefComplaint: 'Dolor torácico',
    })
    const edVisitId = arrived!.entityId
    await step(5)
    await run(triageEdPatient, { edVisitId, triageLevel: 2 })
    await step(10)
    await run(startEdAssessment, { edVisitId })
    await step(60)
    const [, requested] = await run(decideAdmission, { edVisitId, targetSpecialtyCode: 'MIN' })
    await step(1)

    const state = await readState(backend)
    const unitsById = new Map(state.unit.map((u) => [u.id, u]))
    const free = state.bed.find(
      (b) => b.status === 'AVAILABLE' && unitsById.get(b.unitId)?.type === 'WARD',
    )!
    const request = (await backend.repositories.bedRequest.get(requested!.entityId))!
    await run(reserveBed, { bedRequestId: request.id, bedId: free.id })
    await step(10)

    // Reserving the bed created the transfer: dispatch only has to assign, pick up and deliver it.
    const transfer = (await backend.events.list()).findLast((e) => e.type === 'TransferRequested')!
    const porter = state.porter.find((p) => p.status === 'AVAILABLE')!
    await run(assignTransfer, { transferId: transfer.entityId, porterId: porter.id })
    await step(5)
    await run(pickUpTransfer, { transferId: transfer.entityId })
    await step(10)
    await run(deliverTransfer, { transferId: transfer.entityId })
    await run(admitPatient, { admissionId: request.admissionId })
    await run(registerEdDeparture, { edVisitId, outcome: 'ADMITTED' })
    await step(60 * 24)

    await run(orderDischarge, { admissionId: request.admissionId })
    await step(120)
    await run(dischargePatient, { admissionId: request.admissionId })
    await step(20)
    await run(startCleaning, { bedId: free.id })
    await step(30)
    await run(finishCleaning, { bedId: free.id })
    await step(0)

    expect(await backend.repositories.bed.get(free.id)).toMatchObject({ status: 'AVAILABLE' })
    const types = (await backend.events.list()).map((e) => e.type)
    expect(types.slice(1)).toEqual([
      'EdPatientArrived',
      'EdPatientTriaged',
      'EdAssessmentStarted',
      'AdmissionDecided',
      'BedRequested',
      'BedReserved',
      'TransferRequested', // created together with the reservation
      'TransferAssigned',
      'TransferPickedUp',
      'TransferDelivered',
      'PatientAdmitted',
      'EdPatientLeft',
      'DischargeOrdered',
      'PatientDischarged',
      'BedCleaningStarted',
      'BedCleaningFinished',
    ])
  })
})
