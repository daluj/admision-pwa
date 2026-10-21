import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { advanceSimulationTo, runSimulation } from '@/simulator/runner'
import { resetDemo } from '@/simulator/seed/seedDemo'
import { readState, stateViolations } from '@/simulator/stateInvariants'
import {
  HIGH_PRESSURE_ID,
  isScenarioId,
  NORMAL_DAY_ID,
  SCENARIO_DEFINITIONS,
  SCENARIO_IDS,
  WINTER_FLU_ID,
  type ScenarioId,
} from './definitions'
import { getScenario } from './registry'

const HOUR = 3_600_000
afterEach(() => vi.restoreAllMocks())

async function seeded(id: ScenarioId, seed = 42) {
  const backend = createMemoryBackend({ clock: createFixedClock('2026-10-21T10:00:00.000Z') })
  await resetDemo(backend, seed, undefined, id)
  return backend
}

type Load = { occupancy: number; boarding: number; edPresent: number }
async function load(backend: Awaited<ReturnType<typeof seeded>>): Promise<Load> {
  const state = await readState(backend)
  const operational = state.bed.filter((b) => b.status !== 'BLOCKED').length
  return {
    occupancy: state.bed.filter((b) => b.status === 'OCCUPIED').length / operational,
    boarding: state.edVisit.filter((v) => v.phase === 'ADMIT_DECISION').length,
    edPresent: state.edVisit.filter((v) => v.phase !== 'LEFT_ED').length,
  }
}

describe('scenario definitions', () => {
  it('offers the three scenarios of the roadmap, all registered', () => {
    expect([...SCENARIO_IDS]).toEqual([NORMAL_DAY_ID, HIGH_PRESSURE_ID, WINTER_FLU_ID])
    for (const id of SCENARIO_IDS) {
      expect(getScenario(id)?.id).toBe(id)
      expect(isScenarioId(id)).toBe(true)
    }
    expect(isScenarioId('nope')).toBe(false)
    expect(getScenario('nope')).toBeUndefined()
  })

  it('keeps the hospital structure identical; only the starting load differs', () => {
    const base = SCENARIO_DEFINITIONS[NORMAL_DAY_ID].profile
    for (const id of SCENARIO_IDS) {
      const profile = SCENARIO_DEFINITIONS[id].profile
      expect(profile.units).toEqual(base.units)
      expect(profile.porters).toEqual(base.porters)
    }
    expect(SCENARIO_DEFINITIONS[WINTER_FLU_ID].profile.targets.occupancy).toBeGreaterThan(
      SCENARIO_DEFINITIONS[HIGH_PRESSURE_ID].profile.targets.occupancy,
    )
    expect(SCENARIO_DEFINITIONS[HIGH_PRESSURE_ID].profile.targets.occupancy).toBeGreaterThan(
      base.targets.occupancy,
    )
  })
})

describe('resetDemo with a scenario', () => {
  it('stores the scenario and starts from its own load', async () => {
    const loads: Load[] = []
    for (const id of SCENARIO_IDS) {
      const backend = await seeded(id)
      const state = (await backend.repositories.simulationState.get('current'))!
      expect(state.scenarioId).toBe(id)
      loads.push(await load(backend))
    }
    const [normal, high, flu] = loads as [Load, Load, Load]
    expect(high.occupancy).toBeGreaterThan(normal.occupancy)
    expect(flu.occupancy).toBeGreaterThan(high.occupancy)
    expect(high.edPresent).toBeGreaterThan(normal.edPresent)
    expect(flu.edPresent).toBeGreaterThan(high.edPresent)
    expect(flu.boarding).toBeGreaterThan(normal.boarding)
  })

  it('defaults to the normal day', async () => {
    const backend = createMemoryBackend({ clock: createFixedClock('2026-10-21T10:00:00.000Z') })
    await resetDemo(backend, 42)
    expect((await backend.repositories.simulationState.get('current'))!.scenarioId).toBe(
      NORMAL_DAY_ID,
    )
  })
})

describe('scenarios played for a simulated half day (08:00 → 20:00)', () => {
  it('stay consistent and get more congested from normal to high pressure to winter flu', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const end: Record<string, Load> = {}
    for (const id of SCENARIO_IDS) {
      const backend = await seeded(id)
      await runSimulation({ backend, scenario: getScenario(id)!, durationMs: 12 * HOUR })
      expect(stateViolations(await readState(backend))).toEqual([])
      end[id] = await load(backend)
    }
    expect(warn).not.toHaveBeenCalled()
    expect(end[HIGH_PRESSURE_ID]!.edPresent).toBeGreaterThan(end[NORMAL_DAY_ID]!.edPresent)
    expect(end[WINTER_FLU_ID]!.edPresent).toBeGreaterThan(end[HIGH_PRESSURE_ID]!.edPresent)
    expect(end[WINTER_FLU_ID]!.occupancy).toBeGreaterThanOrEqual(end[NORMAL_DAY_ID]!.occupancy)
  }, 240_000)

  it('are deterministic whatever the tick size, and the scenarios differ from each other', async () => {
    const signature = async (id: ScenarioId, chunks: number) => {
      const backend = await seeded(id)
      const scenario = getScenario(id)!
      const start = Date.parse((await backend.repositories.simulationState.get('current'))!.simNow)
      for (let i = 1; i <= chunks; i++) {
        await advanceSimulationTo(
          backend,
          scenario,
          new Date(start + (4 * HOUR * i) / chunks).toISOString(),
        )
      }
      return (await backend.events.list()).map((e) => `${e.type}:${e.entityId}:${e.occurredAt}`)
    }
    const once = await signature(WINTER_FLU_ID, 1)
    expect(await signature(WINTER_FLU_ID, 4)).toEqual(once)
    expect(await signature(HIGH_PRESSURE_ID, 1)).not.toEqual(once)
  }, 240_000)
})
