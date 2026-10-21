import type { Repositories } from '@/data/ports'
import { SIMULATION_STATE_ID, type IsoDateTime } from '@/domain/schemas'
import type { Scenario, SimulationBackend } from '@/simulator/scenarios/types'
import { advanceSimulationTo } from './advance'

export type SimulationRunnerOptions = {
  backend: SimulationBackend
  /** Scenario for a `SimulationState.scenarioId`; `undefined` ⇒ unknown (the runner idles). */
  getScenario: (id: string) => Scenario | undefined
  /** Monotonic wall time in ms (e.g. `performance.now`). Injected: the simulator never reads the system clock. */
  monotonicNow: () => number
  /** Wall time between ticks. */
  tickMs?: number
  /** Longest wall time one tick may account for (background tabs throttle timers). */
  maxCatchUpMs?: number
  onError?: (error: unknown) => void
}

export type SimulationRunner = {
  start: () => void
  stop: () => void
  /** Runs one tick now (tests). */
  tick: () => Promise<void>
}

export const DEFAULT_TICK_MS = 250
export const DEFAULT_MAX_CATCH_UP_MS = 2000

type StateRepo = Repositories['simulationState']

/**
 * Tick loop: while `SimulationState.running`, advances simulated time by `elapsed wall ms × speed`.
 * It is stateless between ticks (reads speed/running/seed every time), so pausing, speed changes
 * and reloads just work. Only the tab that holds the leader lock should run one (see `leader.ts`).
 */
export function createSimulationRunner(options: SimulationRunnerOptions): SimulationRunner {
  const {
    backend,
    getScenario,
    monotonicNow,
    tickMs = DEFAULT_TICK_MS,
    maxCatchUpMs = DEFAULT_MAX_CATCH_UP_MS,
    onError = (error) => console.error('[simulator]', error),
  } = options

  let timer: ReturnType<typeof setTimeout> | null = null
  let lastWall: number | null = null
  let busy = false
  let looping = false
  let stopRequested = false

  const states = (): StateRepo => backend.repositories.simulationState

  async function tick(): Promise<void> {
    if (busy) return
    busy = true
    try {
      const now = monotonicNow()
      const elapsed = lastWall === null ? 0 : Math.min(now - lastWall, maxCatchUpMs)
      lastWall = now

      const state = await states().get(SIMULATION_STATE_ID)
      if (!state || !state.running) return
      const scenario = getScenario(state.scenarioId)
      if (!scenario) return

      const target: IsoDateTime = new Date(
        Date.parse(state.simNow) + elapsed * state.speed,
      ).toISOString()
      await advanceSimulationTo(backend, scenario, target, {
        shouldContinue: () => !stopRequested,
      })
    } catch (error) {
      onError(error)
    } finally {
      busy = false
    }
  }

  const schedule = () => {
    timer = setTimeout(() => {
      void tick().finally(() => {
        if (looping) schedule()
      })
    }, tickMs)
  }

  return {
    start: () => {
      if (looping) return
      looping = true
      stopRequested = false
      lastWall = null
      schedule()
    },
    stop: () => {
      looping = false
      stopRequested = true
      if (timer) clearTimeout(timer)
      timer = null
    },
    tick,
  }
}
