import { AppendError } from '@/data/ports'
import { executeCommand, InvalidCommandError } from '@/domain/commands'
import type { IsoDateTime } from '@/domain/schemas'
import { InvalidTransitionError } from '@/domain/state-machines'
import { createRng } from '@/simulator/random/prng'
import type { MinuteContext, Scenario, SimulationBackend } from '@/simulator/scenarios/types'

export const MINUTE_MS = 60_000

export const minuteIndexOf = (iso: string): number => Math.floor(Date.parse(iso) / MINUTE_MS)
export const minuteIso = (minuteIndex: number): IsoDateTime =>
  new Date(minuteIndex * MINUTE_MS).toISOString()

const hex = (n: number, width: number) => n.toString(16).padStart(width, '0')

/**
 * Ids for everything created in one minute: unique by construction (minute + counter), random
 * but reproducible in the remaining bits. UUID v4-shaped.
 */
function minuteIds(seed: number, minuteIndex: number): () => string {
  const rng = createRng(seed).fork(`ids:${minuteIndex}`)
  let counter = 0
  return () => {
    const tail = rng.uuid().replace(/-/g, '')
    return `${hex(minuteIndex, 8)}-${hex(counter++, 4)}-4${tail.slice(13, 16)}-8${tail.slice(17, 20)}-${tail.slice(20)}`
  }
}

/** Runs the scenario for one simulated minute. */
export async function processMinute(
  backend: SimulationBackend,
  scenario: Scenario,
  seed: number,
  minuteIndex: number,
): Promise<void> {
  const at = minuteIso(minuteIndex)
  const newId = minuteIds(seed, minuteIndex)
  const root = createRng(seed)

  const ctx: MinuteContext = {
    backend,
    seed,
    at,
    minuteIndex,
    rng: (label) => root.fork(`${scenario.id}:${minuteIndex}:${label}`),
    exec: async (command, input) => {
      try {
        return await executeCommand(
          { backend, clock: { now: () => at }, newId, actor: 'simulator' },
          command,
          input,
        )
      } catch (error) {
        if (
          error instanceof InvalidTransitionError ||
          error instanceof InvalidCommandError ||
          error instanceof AppendError
        ) {
          console.warn(`[simulator] ${at} command rejected: ${error.message}`)
          return null
        }
        throw error
      }
    },
  }
  await scenario.step(ctx)
}
