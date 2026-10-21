import { describe, expect, it, vi } from 'vitest'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { getScenario } from '@/simulator/scenarios/registry'
import { NORMAL_DAY_ID } from '@/simulator/scenarios/definitions'
import { resetDemo } from '@/simulator/seed/seedDemo'
import { jumpToTimeOfDay, nextTimeOfDay } from './jump'

const noYield = async () => undefined

async function seeded() {
  const backend = createMemoryBackend({ clock: createFixedClock('2026-10-21T10:00:00.000Z') })
  await resetDemo(backend, 42) // 08:00 Madrid = 06:00Z
  return backend
}
const simNow = async (b: Awaited<ReturnType<typeof seeded>>) =>
  (await b.repositories.simulationState.get('current'))!.simNow

describe('nextTimeOfDay', () => {
  it('is today when the time is still ahead (Madrid wall clock, CEST in October)', () => {
    expect(nextTimeOfDay('2026-10-21T06:00:00.000Z', 14)).toBe('2026-10-21T12:00:00.000Z')
    expect(nextTimeOfDay('2026-10-21T06:00:00.000Z', 8, 30)).toBe('2026-10-21T06:30:00.000Z')
  })
  it('is tomorrow when the time has passed or is exactly now', () => {
    expect(nextTimeOfDay('2026-10-21T06:00:00.000Z', 8)).toBe('2026-10-22T06:00:00.000Z')
    expect(nextTimeOfDay('2026-10-21T13:00:00.000Z', 10)).toBe('2026-10-22T08:00:00.000Z')
  })
  it('works for the late evening hours (22:00, 23:00) from late evening too', () => {
    // 23:30 Madrid on the 21st (CEST) → next 23:00 is the 22nd, not two days later.
    expect(nextTimeOfDay('2026-10-21T21:30:00.000Z', 23)).toBe('2026-10-22T21:00:00.000Z')
    expect(nextTimeOfDay('2026-10-21T20:00:00.000Z', 22)).toBe('2026-10-22T20:00:00.000Z')
    expect(nextTimeOfDay('2026-10-21T20:30:00.000Z', 22)).toBe('2026-10-22T20:00:00.000Z')
    expect(nextTimeOfDay('2026-10-21T21:30:00.000Z', 0)).toBe('2026-10-21T22:00:00.000Z')
  })
  it('follows the clock change at the end of October (CET from 2026-10-25)', () => {
    expect(nextTimeOfDay('2026-10-24T20:00:00.000Z', 8)).toBe('2026-10-25T07:00:00.000Z')
    expect(nextTimeOfDay('2026-10-25T08:00:00.000Z', 8)).toBe('2026-10-26T07:00:00.000Z')
  })
})

describe('jumpToTimeOfDay', () => {
  it('plays the minutes up to the next occurrence of the time and reports progress', async () => {
    const backend = await seeded()
    const progress: number[] = []
    const result = await jumpToTimeOfDay(backend, getScenario(NORMAL_DAY_ID)!, {
      hour: 10,
      chunkMinutes: 30,
      yieldToUi: noYield,
      onProgress: ({ fraction }) => progress.push(fraction),
    })
    expect(result).toEqual({
      target: '2026-10-21T08:00:00.000Z',
      reached: '2026-10-21T08:00:00.000Z',
      cancelled: false,
    })
    expect(await simNow(backend)).toBe('2026-10-21T08:00:00.000Z')
    expect(progress).toEqual([0.25, 0.5, 0.75, 1])
    expect((await backend.events.list()).length).toBeGreaterThan(1) // the day actually happened
  }, 60_000)

  it('gives the same day as playing the span in one go', async () => {
    const a = await seeded()
    const b = await seeded()
    await jumpToTimeOfDay(a, getScenario(NORMAL_DAY_ID)!, {
      hour: 9,
      yieldToUi: noYield,
      chunkMinutes: 7,
    })
    await jumpToTimeOfDay(b, getScenario(NORMAL_DAY_ID)!, {
      hour: 9,
      yieldToUi: noYield,
      chunkMinutes: 60,
    })
    const sig = async (x: typeof a) => (await x.events.list()).map((e) => `${e.type}:${e.entityId}`)
    expect(await sig(a)).toEqual(await sig(b))
  }, 60_000)

  it('can be cancelled between chunks and never goes back', async () => {
    const backend = await seeded()
    let chunks = 0
    const result = await jumpToTimeOfDay(backend, getScenario(NORMAL_DAY_ID)!, {
      hour: 14,
      chunkMinutes: 30,
      yieldToUi: noYield,
      isCancelled: () => chunks >= 2,
      onProgress: () => void chunks++,
    })
    expect(result.cancelled).toBe(true)
    expect(result.reached).toBe('2026-10-21T07:00:00.000Z')
    expect(await simNow(backend)).toBe('2026-10-21T07:00:00.000Z')
    // A later jump continues from there.
    const next = await jumpToTimeOfDay(backend, getScenario(NORMAL_DAY_ID)!, {
      hour: 10,
      yieldToUi: noYield,
    })
    expect(next.cancelled).toBe(false)
    expect(await simNow(backend)).toBe('2026-10-21T08:00:00.000Z')
  }, 60_000)

  it('refuses to run before the demo is seeded', async () => {
    const backend = createMemoryBackend()
    await expect(
      jumpToTimeOfDay(backend, getScenario(NORMAL_DAY_ID)!, { hour: 10 }),
    ).rejects.toThrow(/seed/i)
    vi.restoreAllMocks()
  })
})
