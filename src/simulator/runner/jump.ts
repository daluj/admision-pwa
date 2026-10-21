import type { IsoDateTime } from '@/domain/schemas'
import { addMinutes, HOSPITAL_TIME_ZONE, zonedDayAt } from '@/lib/time'
import type { Scenario, SimulationBackend } from '@/simulator/scenarios/types'
import { advanceSimulationTo, SimulationNotSeededError } from './advance'

/** Next instant strictly after `from` whose Madrid wall-clock time is `hour:minute`. */
export function nextTimeOfDay(from: IsoDateTime, hour: number, minute = 0): IsoDateTime {
  const today = zonedDayAt(from, HOSPITAL_TIME_ZONE, hour, minute)
  if (Date.parse(today) > Date.parse(from)) return today
  return zonedDayAt(addMinutes(today, 1440 + 120), HOSPITAL_TIME_ZONE, hour, minute)
}

export type JumpOptions = {
  hour: number
  minute?: number
  /** Stops at the next chunk boundary when it returns true. */
  isCancelled?: () => boolean
  /** Fraction done (0–1) and the simulated time reached, after every chunk. */
  onProgress?: (progress: { fraction: number; at: IsoDateTime }) => void
  /** Called between chunks so a UI can paint (default: a macrotask). */
  yieldToUi?: () => Promise<void>
  /** Simulated minutes played between progress reports. */
  chunkMinutes?: number
}

export type JumpResult = { target: IsoDateTime; reached: IsoDateTime; cancelled: boolean }

const MINUTE_MS = 60_000
const macrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/**
 * Fast-forwards the simulation to the next `hour:minute` (Europe/Madrid) by playing the minutes
 * headlessly through `advanceSimulationTo` — the very code the live runner uses, so the day is
 * the same as if it had been watched. The caller pauses the run first (nothing else may write
 * the clock meanwhile). Cancelling stops at a chunk boundary; the clock never goes back.
 */
export async function jumpToTimeOfDay(
  backend: SimulationBackend,
  scenario: Scenario,
  options: JumpOptions,
): Promise<JumpResult> {
  const { hour, minute = 0, isCancelled = () => false, onProgress, chunkMinutes = 15 } = options
  const yieldToUi = options.yieldToUi ?? macrotask
  const state = await backend.repositories.simulationState.get('current')
  if (!state) throw new SimulationNotSeededError()

  const start = Date.parse(state.simNow)
  const target = nextTimeOfDay(state.simNow, hour, minute)
  const span = Date.parse(target) - start
  let reached: IsoDateTime = state.simNow

  while (Date.parse(reached) < Date.parse(target)) {
    if (isCancelled()) return { target, reached, cancelled: true }
    const next = new Date(
      Math.min(Date.parse(target), Date.parse(reached) + chunkMinutes * MINUTE_MS),
    ).toISOString()
    await advanceSimulationTo(backend, scenario, next)
    reached = next
    onProgress?.({ fraction: Math.min(1, (Date.parse(reached) - start) / span), at: reached })
    await yieldToUi()
  }
  return { target, reached, cancelled: false }
}
