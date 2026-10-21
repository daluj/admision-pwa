import { beforeEach, describe, expect, it } from 'vitest'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { createCommandHarness, type CommandHarness } from '@/test/commandHarness'
import {
  advanceSimulation,
  pauseSimulation,
  setSimulationSpeed,
  startSimulation,
} from './simulation'
import { InvalidCommandError } from './types'

let h: CommandHarness
const state = () => h.backend.repositories.simulationState.get('current')

beforeEach(async () => {
  h = createCommandHarness({ start: '2026-10-21T08:00:00.000Z' })
  await h.backend.events.append(
    [],
    [{ entity: 'simulationState', op: 'put', record: { ...sampleEntities.simulationState } }],
  )
})

describe('simulation control commands', () => {
  it('starts and pauses, emitting control events', async () => {
    const [started] = await h.run(startSimulation, {})
    expect(started).toMatchObject({
      type: 'SimulationStarted',
      entityType: 'SimulationState',
      entityId: 'current',
      occurredAt: '2026-10-21T08:00:00.000Z',
    })
    expect(await state()).toMatchObject({ running: true })

    const [paused] = await h.run(pauseSimulation, {})
    expect(paused!.type).toBe('SimulationPaused')
    expect(await state()).toMatchObject({ running: false })
  })

  it('rejects starting twice and pausing when paused', async () => {
    await expect(h.run(pauseSimulation, {})).rejects.toThrow(InvalidCommandError)
    await h.run(startSimulation, {})
    await expect(h.run(startSimulation, {})).rejects.toThrow(/already running/)
  })

  it('changes the speed to a supported value only', async () => {
    const [event] = await h.run(setSimulationSpeed, { speed: 300 })
    expect(event).toMatchObject({ type: 'SimulationSpeedChanged', payload: { speed: 300 } })
    expect(await state()).toMatchObject({ speed: 300 })

    await expect(h.run(setSimulationSpeed, { speed: 300 })).rejects.toThrow(/already/)
    await expect(h.run(setSimulationSpeed, { speed: 7 as unknown as 60 })).rejects.toThrow(
      /Unsupported/,
    )
    expect(await h.backend.events.lastSeq()).toBe(1)
  })
})

describe('advanceSimulation', () => {
  it('is a state-only change that writes no event', async () => {
    const current = (await state())!
    const change = advanceSimulation(current, '2026-10-21T08:05:00.000Z')
    await h.backend.events.append([], [change])
    expect(await state()).toMatchObject({ simNow: '2026-10-21T08:05:00.000Z' })
    expect(await h.backend.events.lastSeq()).toBe(0)
  })

  it('refuses to move time backwards', async () => {
    const current = (await state())!
    expect(() => advanceSimulation(current, '2026-10-19T08:00:00.000Z')).toThrow(
      InvalidCommandError,
    )
  })
})
