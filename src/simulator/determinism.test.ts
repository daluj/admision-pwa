import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { DataBackend } from '@/data/ports'
import { advanceSimulationTo, runSimulation } from './runner'
import { normalDay } from './scenarios/normalDay'
import { ensureDemoSeeded } from './seed/seedDemo'
import { readState } from './stateInvariants'

const HOUR = 3_600_000
// Each case simulates hours of hospital time, twice.
const TIMEOUT = 120_000
const WALL = '2026-10-21T10:00:00.000Z' // the demo anchors at 08:00 Madrid of this day

async function seeded(seed: number): Promise<DataBackend> {
  const backend = createMemoryBackend({ clock: createFixedClock(WALL) })
  await ensureDemoSeeded(backend, seed)
  return backend
}

async function snapshot(backend: DataBackend) {
  return { events: await backend.events.list(), state: await readState(backend) }
}

describe('determinism', () => {
  it(
    'same seed + scenario + duration ⇒ identical event sequence and tables',
    async () => {
      const a = await seeded(42)
      const b = await seeded(42)
      await runSimulation({ backend: a, scenario: normalDay, durationMs: 6 * HOUR })
      await runSimulation({ backend: b, scenario: normalDay, durationMs: 6 * HOUR })

      const first = await snapshot(a)
      const second = await snapshot(b)
      expect(first.events.length).toBeGreaterThan(100)
      expect(second.events).toEqual(first.events)
      expect(second.state).toEqual(first.state)
    },
    TIMEOUT,
  )

  it(
    'does not depend on how the time is sliced (tick size / speed)',
    async () => {
      const whole = await seeded(42)
      await runSimulation({ backend: whole, scenario: normalDay, durationMs: 3 * HOUR })

      const sliced = await seeded(42)
      const start = Date.parse((await sliced.repositories.simulationState.get('current'))!.simNow)
      const end = start + 3 * HOUR
      const steps = [15_000, 75_000, 4 * 60_000 + 1_000, 20 * 60_000, 37_000]
      for (let t = start, i = 0; t < end; i++) {
        t = Math.min(t + steps[i % steps.length]!, end)
        await advanceSimulationTo(sliced, normalDay, new Date(t).toISOString())
      }

      const a = await snapshot(whole)
      const b = await snapshot(sliced)
      expect(b.events).toEqual(a.events)
      expect(b.state).toEqual(a.state)
    },
    TIMEOUT,
  )

  it(
    'a different seed gives a different day',
    async () => {
      const a = await seeded(42)
      const b = await seeded(43)
      await runSimulation({ backend: a, scenario: normalDay, durationMs: 3 * HOUR })
      await runSimulation({ backend: b, scenario: normalDay, durationMs: 3 * HOUR })
      const first = (await a.events.list()).map((e) => `${e.type}@${e.occurredAt}`)
      const second = (await b.events.list()).map((e) => `${e.type}@${e.occurredAt}`)
      expect(second).not.toEqual(first)
    },
    TIMEOUT,
  )
})
