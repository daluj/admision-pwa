import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { runSimulation } from '@/simulator/runner'
import { ensureDemoSeeded } from '@/simulator/seed/seedDemo'
import { readState, stateViolations } from '@/simulator/stateInvariants'
import { normalDay } from './normalDay'

const HOUR = 3_600_000

afterEach(() => vi.restoreAllMocks())

/** Event types a normal day must produce (everything except alerts and simulator controls). */
const EXPECTED_TYPES = [
  'EdPatientArrived',
  'EdPatientTriaged',
  'EdAssessmentStarted',
  'AdmissionDecided',
  'EdPatientLeft',
  'ScheduledAdmissionCreated',
  'BedRequested',
  'BedReserved',
  'PatientAdmitted',
  'ExpectedDischargeSet',
  'DischargeOrdered',
  'PatientDischarged',
  'BedCleaningStarted',
  'BedCleaningFinished',
  'TransferRequested',
  'TransferAssigned',
  'TransferPickedUp',
  'TransferDelivered',
] as const

describe('normal day, 24 simulated hours from the seeded 08:00', () => {
  it('keeps the hospital consistent, busy and free of rejected commands', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const backend = createMemoryBackend({ clock: createFixedClock('2026-10-21T10:00:00.000Z') })
    await ensureDemoSeeded(backend, 42)

    await runSimulation({ backend, scenario: normalDay, durationMs: 24 * HOUR })

    expect(warn).not.toHaveBeenCalled()

    const state = await readState(backend)
    expect(stateViolations(state)).toEqual([])

    const events = await backend.events.list()
    expect(events.length).toBeGreaterThan(100)
    const types = new Set(events.map((e) => e.type))
    for (const type of EXPECTED_TYPES) expect(types, type).toContain(type)
    expect(events.map((e) => e.seq)).toEqual(events.map((_, i) => i + 1))

    const operational = state.bed.filter((b) => b.status !== 'BLOCKED').length
    const occupancy = state.bed.filter((b) => b.status === 'OCCUPIED').length / operational
    expect(occupancy).toBeGreaterThan(0.7)
    expect(occupancy).toBeLessThanOrEqual(1)

    // Nobody is in an impossible place: every bed holds at most one inpatient.
    const occupants = state.bed.flatMap((b) => (b.patientId ? [b.patientId] : []))
    expect(new Set(occupants).size).toBe(occupants.length)
  }, 120_000)
})
