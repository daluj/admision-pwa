import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { DataBackend } from '@/data/ports'
import {
  executeCommand,
  type Command,
  registerEdArrival,
  setSimulationSpeed,
  startSimulation,
  pauseSimulation,
} from '@/domain/commands'
import { EventId } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import type { Scenario } from '@/simulator/scenarios/types'
import { counterIds } from '@/test/commandHarness'
import { advanceSimulationTo } from './advance'
import { minuteIndexOf, minuteIso, processMinute } from './minute'
import { runAsLeader, type LockManagerLike } from './leader'
import { createSimulationRunner } from './runner'
import { runSimulation } from './runSimulation'

const START = '2026-10-21T08:00:00.000Z'

/** One ED arrival per minute with probability 0.4; names/MRN from the minute's stream. */
const arrivals: Scenario = {
  id: 'test-arrivals',
  step: async (ctx) => {
    const rng = ctx.rng('arrivals')
    if (!rng.chance(0.4)) return
    await ctx.exec(registerEdArrival, {
      patient: {
        data: {
          mrn: `SIM-${ctx.minuteIndex}`,
          firstName: 'Test',
          lastName: `Ficticio ${rng.int(1, 99)}`,
          sex: 'X',
          birthYear: 1950 + rng.int(0, 50),
        },
      },
      chiefComplaint: 'Test',
    })
  },
}

async function seededBackend(overrides: Partial<typeof sampleEntities.simulationState> = {}) {
  const backend = createMemoryBackend({ validateSchemas: true })
  await backend.events.append(
    [],
    [
      {
        entity: 'simulationState',
        op: 'put',
        record: {
          ...sampleEntities.simulationState,
          simNow: START,
          startedAt: START,
          ...overrides,
        },
      },
    ],
  )
  return backend
}

const simNow = async (b: DataBackend) =>
  (await b.repositories.simulationState.get('current'))!.simNow
const arrivalEvents = async (b: DataBackend) =>
  (await b.events.list()).filter((e) => e.type === 'EdPatientArrived')

describe('minute processing', () => {
  it('stamps events with the minute and creates unique UUID ids', async () => {
    const backend = await seededBackend()
    const always: Scenario = { id: 'always', step: arrivals.step }
    // Force arrivals on a range of minutes.
    for (let m = minuteIndexOf(START) + 1; m < minuteIndexOf(START) + 400; m++) {
      await processMinute(backend, always, 42, m)
    }
    const events = await arrivalEvents(backend)
    expect(events.length).toBeGreaterThan(100)
    for (const e of events) {
      expect(EventId.safeParse(e.id).success).toBe(true)
      expect(e.occurredAt).toBe(minuteIso(minuteIndexOf(e.occurredAt)))
    }
    const ids = (await backend.events.list()).map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    const entityIds = new Set(events.map((e) => e.entityId))
    expect(entityIds.size).toBe(events.length)
  })

  it('logs a rejected command and carries on', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const backend = await seededBackend()
    const failing: Scenario = {
      id: 'failing',
      step: async (ctx) => {
        const result = await ctx.exec(registerEdArrival, {
          patient: { patientId: 'unknown' },
          chiefComplaint: 'x',
        })
        expect(result).toBeNull()
      },
    }
    await processMinute(backend, failing, 1, minuteIndexOf(START) + 1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('command rejected'))
    warn.mockRestore()
  })
})

describe('advanceSimulationTo', () => {
  it('plays every whole minute once and ends exactly at the target', async () => {
    const backend = await seededBackend()
    await advanceSimulationTo(backend, arrivals, '2026-10-21T08:10:30.000Z')
    expect(await simNow(backend)).toBe('2026-10-21T08:10:30.000Z')
    const minutes = (await arrivalEvents(backend)).map((e) => minuteIndexOf(e.occurredAt))
    expect(new Set(minutes).size).toBe(minutes.length)
    expect(Math.min(...minutes)).toBeGreaterThanOrEqual(minuteIndexOf(START) + 1)
    expect(Math.max(...minutes)).toBeLessThanOrEqual(minuteIndexOf('2026-10-21T08:10:00.000Z'))
  })

  it('does not replay minutes already covered', async () => {
    const backend = await seededBackend()
    await advanceSimulationTo(backend, arrivals, '2026-10-21T09:00:00.000Z')
    const before = (await backend.events.list()).length
    await advanceSimulationTo(backend, arrivals, '2026-10-21T09:00:00.000Z')
    await advanceSimulationTo(backend, arrivals, '2026-10-21T08:30:00.000Z')
    expect((await backend.events.list()).length).toBe(before)
    expect(await simNow(backend)).toBe('2026-10-21T09:00:00.000Z')
  })

  it('gives the same events whatever the chunking (tick size / speed independence)', async () => {
    const whole = await seededBackend()
    await advanceSimulationTo(whole, arrivals, '2026-10-21T11:00:00.000Z')

    const chunked = await seededBackend()
    let t = Date.parse(START)
    const steps = [75_000, 15_000, 600_000, 1_000, 3_333_000]
    for (let i = 0; t < Date.parse('2026-10-21T11:00:00.000Z'); i++) {
      t = Math.min(t + steps[i % steps.length]!, Date.parse('2026-10-21T11:00:00.000Z'))
      await advanceSimulationTo(chunked, arrivals, new Date(t).toISOString())
    }
    expect(await chunked.events.list()).toEqual(await whole.events.list())
  })

  it('never undoes a pause that commits while the clock is being written', async () => {
    const backend = await seededBackend({ running: true })
    const real = backend.events.append.bind(backend.events)
    let raced = false
    vi.spyOn(backend.events, 'append').mockImplementation(async (events, changes, options) => {
      if (!raced && events.length === 0) {
        raced = true
        // The user presses Pause after the runner read the state and before it writes simNow.
        await executeCommand(
          { backend, clock: { now: () => START }, newId: counterIds(700_000) },
          pauseSimulation,
          {},
        )
      }
      return real(events, changes, options)
    })

    await advanceSimulationTo(backend, arrivals, '2026-10-21T08:00:10.000Z')

    const state = (await backend.repositories.simulationState.get('current'))!
    expect(state).toMatchObject({ running: false, simNow: '2026-10-21T08:00:10.000Z' })
    expect((await backend.events.list()).map((e) => e.type)).toEqual(['SimulationPaused'])
  })

  it('stops when shouldContinue turns false', async () => {
    const backend = await seededBackend()
    let calls = 0
    await advanceSimulationTo(backend, arrivals, '2026-10-21T12:00:00.000Z', {
      shouldContinue: () => calls++ < 5,
    })
    expect(Date.parse(await simNow(backend))).toBeLessThan(Date.parse('2026-10-21T08:10:00.000Z'))
  })

  it('requires a seeded SimulationState', async () => {
    const backend = createMemoryBackend()
    await expect(advanceSimulationTo(backend, arrivals, START)).rejects.toThrow(/seed the demo/)
  })
})

describe('runSimulation', () => {
  it('runs headless for a simulated duration', async () => {
    const backend = await seededBackend()
    const end = await runSimulation({ backend, scenario: arrivals, durationMs: 2 * 3_600_000 })
    expect(end).toBe('2026-10-21T10:00:00.000Z')
    expect(await simNow(backend)).toBe(end)
    expect((await arrivalEvents(backend)).length).toBeGreaterThan(20)
  })
})

describe('createSimulationRunner', () => {
  let wall = 0
  const make = (backend: DataBackend, extra = {}) =>
    createSimulationRunner({
      backend,
      getScenario: (id) => (id === arrivals.id ? arrivals : undefined),
      monotonicNow: () => wall,
      ...extra,
    })
  const controlIds = counterIds(900_000)
  const control = <I>(backend: DataBackend, command: Command<I>, input: I) =>
    executeCommand({ backend, clock: { now: () => START }, newId: controlIds }, command, input)

  beforeEach(() => {
    wall = 0
  })

  it('does nothing while paused', async () => {
    const backend = await seededBackend({ scenarioId: arrivals.id })
    const runner = make(backend)
    await runner.tick()
    wall += 1000
    await runner.tick()
    expect(await simNow(backend)).toBe(START)
  })

  it('advances simulated time by elapsed wall time × speed', async () => {
    const backend = await seededBackend({ scenarioId: arrivals.id, speed: 60, running: true })
    const runner = make(backend)
    await runner.tick() // establishes the wall reference
    wall += 250
    await runner.tick()
    expect(await simNow(backend)).toBe('2026-10-21T08:00:15.000Z')
    wall += 250
    await runner.tick()
    expect(await simNow(backend)).toBe('2026-10-21T08:00:30.000Z')
  })

  it('applies speed changes and stops at pause', async () => {
    const backend = await seededBackend({ scenarioId: arrivals.id, speed: 60, running: false })
    const runner = make(backend)
    await control(backend, startSimulation, {})
    await runner.tick()
    await control(backend, setSimulationSpeed, { speed: 300 })
    wall += 1000
    await runner.tick()
    expect(await simNow(backend)).toBe('2026-10-21T08:05:00.000Z')

    await control(backend, pauseSimulation, {})
    wall += 1000
    await runner.tick()
    expect(await simNow(backend)).toBe('2026-10-21T08:05:00.000Z')
  })

  it('caps the catch-up after a long pause of the timers', async () => {
    const backend = await seededBackend({ scenarioId: arrivals.id, speed: 1, running: true })
    const runner = make(backend, { maxCatchUpMs: 2000 })
    await runner.tick()
    wall += 60_000
    await runner.tick()
    expect(await simNow(backend)).toBe('2026-10-21T08:00:02.000Z')
  })

  it('idles on an unknown scenario and reports errors without dying', async () => {
    const backend = await seededBackend({ scenarioId: 'nope', running: true })
    const runner = make(backend)
    await runner.tick()
    wall += 250
    await runner.tick()
    expect(await simNow(backend)).toBe(START)

    const onError = vi.fn()
    const broken = createMemoryBackend()
    const failing = make(broken, { onError })
    await failing.tick()
    expect(onError).not.toHaveBeenCalled() // no state ⇒ nothing to do
  })

  describe('with timers', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('ticks on an interval until stopped', async () => {
      const backend = await seededBackend({ scenarioId: arrivals.id, speed: 60, running: true })
      const runner = make(backend, { monotonicNow: () => performance.now() })
      runner.start()
      await vi.advanceTimersByTimeAsync(1000)
      const reached = await simNow(backend)
      expect(Date.parse(reached)).toBeGreaterThan(Date.parse(START))

      runner.stop()
      await vi.advanceTimersByTimeAsync(2000)
      expect(await simNow(backend)).toBe(reached)
    })
  })
})

/** Minimal Web Locks fake: one holder per name, FIFO queue, abort support. */
function fakeLocks(): LockManagerLike {
  const queues = new Map<string, Array<() => void>>()
  const held = new Set<string>()
  return {
    request: (name, { signal }, callback) =>
      new Promise((resolve, reject) => {
        const run = async () => {
          held.add(name)
          try {
            resolve(await callback())
          } finally {
            held.delete(name)
            queues.get(name)?.shift()?.()
          }
        }
        signal.addEventListener('abort', () => {
          const queue = queues.get(name) ?? []
          const index = queue.indexOf(run)
          if (index >= 0) {
            queue.splice(index, 1)
            reject(new DOMException('aborted', 'AbortError'))
          }
        })
        if (held.has(name)) queues.set(name, [...(queues.get(name) ?? []), run])
        else void run()
      }),
  }
}

describe('runAsLeader', () => {
  it('only one tab is leader; the next takes over when it stops', async () => {
    const locks = fakeLocks()
    const log: string[] = []
    const tab = (name: string) =>
      runAsLeader(
        () => {
          log.push(`${name}:lead`)
          return () => log.push(`${name}:stop`)
        },
        locks,
        'lock',
      )

    const a = tab('a')
    const b = tab('b')
    await new Promise((r) => setTimeout(r, 0))
    expect(log).toEqual(['a:lead'])

    a.stop()
    await new Promise((r) => setTimeout(r, 0))
    expect(log).toEqual(['a:lead', 'a:stop', 'b:lead'])
    b.stop()
  })

  it('a queued tab that stops never leads; no Web Locks ⇒ leads immediately', async () => {
    const locks = fakeLocks()
    const lead = vi.fn(() => () => {})
    const a = runAsLeader(() => () => {}, locks, 'x')
    const b = runAsLeader(lead, locks, 'x')
    b.stop()
    a.stop()
    await new Promise((r) => setTimeout(r, 0))
    expect(lead).not.toHaveBeenCalled()

    const cleanup = vi.fn()
    const solo = runAsLeader(() => cleanup, undefined, 'x')
    // `undefined` falls back to navigator.locks; jsdom has none ⇒ leads immediately.
    solo.stop()
    expect(cleanup).toHaveBeenCalled()
  })
})
