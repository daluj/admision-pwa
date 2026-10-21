import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { createSimulationClock } from './simulationClock'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('createSimulationClock', () => {
  it('falls back to the wall clock until the demo is seeded', async () => {
    const backend = createMemoryBackend()
    const clock = createSimulationClock(
      backend.repositories,
      createFixedClock('2026-01-01T00:00:00.000Z'),
    )
    await flush()
    expect(clock.now()).toBe('2026-01-01T00:00:00.000Z')
    clock.dispose()
  })

  it('follows simNow as it changes', async () => {
    const backend = createMemoryBackend()
    const clock = createSimulationClock(
      backend.repositories,
      createFixedClock('2026-01-01T00:00:00.000Z'),
    )
    await backend.events.append(
      [],
      [{ entity: 'simulationState', op: 'put', record: { ...sampleEntities.simulationState } }],
    )
    await flush()
    expect(clock.now()).toBe(sampleEntities.simulationState.simNow)

    await backend.events.append(
      [],
      [
        {
          entity: 'simulationState',
          op: 'put',
          record: { ...sampleEntities.simulationState, simNow: '2026-10-20T09:15:00.000Z' },
        },
      ],
    )
    await flush()
    expect(clock.now()).toBe('2026-10-20T09:15:00.000Z')
    clock.dispose()
  })

  it('stops following after dispose', async () => {
    const backend = createMemoryBackend()
    const clock = createSimulationClock(
      backend.repositories,
      createFixedClock('2026-01-01T00:00:00.000Z'),
    )
    clock.dispose()
    await backend.events.append(
      [],
      [{ entity: 'simulationState', op: 'put', record: { ...sampleEntities.simulationState } }],
    )
    await flush()
    expect(clock.now()).toBe('2026-01-01T00:00:00.000Z')
  })
})
