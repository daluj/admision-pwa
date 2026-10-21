import type { Clock, DataBackend } from '@/data/ports'
import { ConcurrencyError } from '@/data/ports'
import type { Actor, HospitalEvent, NewHospitalEvent } from '@/domain/schemas'
import { NewHospitalEvent as NewHospitalEventSchema } from '@/domain/schemas'
import type { Command, CommandContext } from './types'
import { InvalidCommandError } from './types'

export type ExecuteDeps = {
  backend: Pick<DataBackend, 'repositories' | 'events'>
  /** Source of "now": the simulation clock in the app, a fixed clock in tests. */
  clock: Clock
  newId: () => string
  actor?: Actor
}

export const MAX_COMMAND_ATTEMPTS = 3

/**
 * Runs a command and persists its events and state changes in ONE transaction.
 * The store's last `seq` is read before the state, and checked again on write (`expectedLastSeq`):
 * if another writer got in between, the command is rebuilt from fresh state (up to 3 attempts).
 * Rejected commands (invalid input or transition) throw and write nothing.
 */
export async function executeCommand<Input>(
  deps: ExecuteDeps,
  command: Command<Input>,
  input: Input,
): Promise<HospitalEvent[]> {
  const { backend, clock, newId, actor = 'simulator' } = deps

  for (let attempt = 1; ; attempt++) {
    const expectedLastSeq = await backend.events.lastSeq()
    const ctx: CommandContext = {
      repositories: backend.repositories,
      now: clock.now(),
      newId,
      actor,
    }
    const result = await command(ctx, input)
    assertValidEvents(result.events)

    try {
      return await backend.events.append(result.events, result.changes, { expectedLastSeq })
    } catch (error) {
      if (!(error instanceof ConcurrencyError) || attempt >= MAX_COMMAND_ATTEMPTS) throw error
    }
  }
}

function assertValidEvents(events: readonly NewHospitalEvent[]): void {
  if (events.length === 0)
    throw new InvalidCommandError('A command must produce at least one event')
  for (const event of events) {
    const parsed = NewHospitalEventSchema.safeParse(event)
    if (!parsed.success) {
      throw new InvalidCommandError(`Command produced an invalid ${event.type} event`, {
        cause: parsed.error,
      })
    }
  }
}
