import { createFixedClock, type FixedClock } from '@/data/adapters/clock/fixedClock'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { DataBackend } from '@/data/ports'
import { executeCommand, type ExecuteDeps } from '@/domain/commands/execute'
import type { Command } from '@/domain/commands/types'
import type { HospitalEvent } from '@/domain/schemas'

/** Deterministic UUID-shaped ids: `00000000-0000-4000-8000-000000000001`, … */
export function counterIds(start = 1): () => string {
  let n = start
  return () => `00000000-0000-4000-8000-${String(n++).padStart(12, '0')}`
}

export type CommandHarness = {
  backend: DataBackend
  clock: FixedClock
  deps: ExecuteDeps
  /** Runs a command against the harness backend. */
  run: <Input>(command: Command<Input>, input: Input) => Promise<HospitalEvent[]>
}

/** Memory backend + fixed clock + counter ids, for command tests. Schema validation is on. */
export function createCommandHarness(
  options: { start?: string; backend?: DataBackend } = {},
): CommandHarness {
  const backend = options.backend ?? createMemoryBackend({ validateSchemas: true })
  const clock = createFixedClock(options.start)
  const deps: ExecuteDeps = { backend, clock, newId: counterIds(1000) }
  return { backend, clock, deps, run: (command, input) => executeCommand(deps, command, input) }
}
