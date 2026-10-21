import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { advanceSimulationTo } from '@/simulator/runner'
import { resetDemo } from '@/simulator/seed/seedDemo'
import { NORMAL_DAY_ID } from './definitions'
import { createScenario, normalDay } from './normalDay'
import { NORMAL_TUNING, scaleRange } from './tuning'

describe('scaleRange', () => {
  it('is the very same range at factor 1', () => {
    const range = [5, 40] as const
    expect(scaleRange(range, 1)).toBe(range)
  })
  it('stretches and rounds both ends, slower or faster', () => {
    expect(scaleRange([10, 60], 1.5)).toEqual([15, 90])
    expect(scaleRange([5, 12], 1.3)).toEqual([7, 16])
    expect(scaleRange([10, 60], 0.5)).toEqual([5, 30])
  })
  it('never lets max fall below min', () => {
    const [min, max] = scaleRange([0, 0], 3)
    expect(max).toBeGreaterThanOrEqual(min)
    expect(scaleRange([3, 3], 0.4)[1]).toBeGreaterThanOrEqual(scaleRange([3, 3], 0.4)[0])
  })
})

describe('tuning reaches the policies', () => {
  const HOUR = 3_600_000
  async function events(tuning?: Partial<typeof NORMAL_TUNING>, hours = 6) {
    const backend = createMemoryBackend({ clock: createFixedClock('2026-10-21T10:00:00.000Z') })
    await resetDemo(backend, 42)
    const scenario = createScenario(
      NORMAL_DAY_ID,
      tuning ? { ...NORMAL_TUNING, ...tuning } : undefined,
    )
    const start = Date.parse((await backend.repositories.simulationState.get('current'))!.simNow)
    await advanceSimulationTo(backend, scenario, new Date(start + hours * HOUR).toISOString())
    return (await backend.events.list()).map((e) => `${e.type}:${e.entityId}:${e.occurredAt}`)
  }
  const count = (list: string[], type: string) =>
    list.filter((e) => e.startsWith(`${type}:`)).length

  it('without tuning the day is exactly the normal day (explicit normal tuning changes nothing)', async () => {
    const plain = await events()
    expect(await events({})).toEqual(plain)
    // The shipped normal-day scenario is the same code path.
    const backend = createMemoryBackend({ clock: createFixedClock('2026-10-21T10:00:00.000Z') })
    await resetDemo(backend, 42)
    const start = Date.parse((await backend.repositories.simulationState.get('current'))!.simNow)
    await advanceSimulationTo(backend, normalDay, new Date(start + 6 * HOUR).toISOString())
    expect(
      (await backend.events.list()).map((e) => `${e.type}:${e.entityId}:${e.occurredAt}`),
    ).toEqual(plain)
  }, 120_000)

  it('arrivalsMultiplier changes the number of ED arrivals (and is capped at one per minute)', async () => {
    const base = count(await events(), 'EdPatientArrived')
    expect(count(await events({ arrivalsMultiplier: 2 }), 'EdPatientArrived')).toBeGreaterThan(base)
    expect(count(await events({ arrivalsMultiplier: 0 }), 'EdPatientArrived')).toBe(0)
    // 6 h = 360 minutes: even an absurd multiplier cannot exceed one arrival per minute.
    expect(
      count(await events({ arrivalsMultiplier: 1000 }), 'EdPatientArrived'),
    ).toBeLessThanOrEqual(360)
  }, 120_000)

  it('admitShare changes the number of admission decisions', async () => {
    const none = await events({ admitShare: 0 })
    const all = await events({ admitShare: 1 })
    expect(count(none, 'AdmissionDecided')).toBe(0)
    expect(count(all, 'AdmissionDecided')).toBeGreaterThan(
      count(await events(), 'AdmissionDecided'),
    )
  }, 120_000)

  it('slower transfers and cleaning mean fewer completed ones in the same time', async () => {
    const fast = await events()
    const slow = await events({ transferDelayFactor: 5, cleaningDelayFactor: 5 })
    expect(count(slow, 'TransferDelivered')).toBeLessThanOrEqual(count(fast, 'TransferDelivered'))
    expect(count(slow, 'BedCleaningFinished')).toBeLessThan(count(fast, 'BedCleaningFinished'))
  }, 120_000)

  it('more blocks per day block more beds', async () => {
    expect(count(await events({ blocksPerDay: 200 }), 'BedBlocked')).toBeGreaterThan(
      count(await events(), 'BedBlocked'),
    )
  }, 120_000)
})
