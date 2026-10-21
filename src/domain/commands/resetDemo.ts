import type { Change } from '@/data/ports'
import {
  ENTITY_NAMES,
  entitySchemas,
  type Actor,
  type EntityName,
  type EntityOf,
  type EventId,
  type IsoDateTime,
} from '@/domain/schemas'
import { InvalidCommandError, type CommandResult } from './types'

/** Every row to load, keyed by entity name. */
export type EntitySnapshot = { [N in EntityName]: EntityOf<N>[] }

export type ResetDemoInput = {
  snapshot: EntitySnapshot
  seed: number
  profileId: string
  anchorAt: IsoDateTime
  eventId: EventId
  actor?: Actor
}

/**
 * Loads a complete synthetic hospital: one `DemoSeeded` event plus a `put` for every row.
 * The caller writes the result with `EventStore.reset` (or `append` on an empty store).
 */
export function resetDemo(input: ResetDemoInput): CommandResult {
  const { snapshot, seed, profileId, anchorAt, eventId, actor = 'simulator' } = input

  const changes: Change[] = []
  const counts: Record<string, number> = {}
  for (const entity of ENTITY_NAMES) {
    const rows = snapshot[entity]
    counts[entity] = rows.length
    for (const record of rows) {
      const result = entitySchemas[entity].safeParse(record)
      if (!result.success) {
        throw new InvalidCommandError(`Invalid ${entity} ${record.id}: ${result.error.message}`, {
          cause: result.error,
        })
      }
      changes.push({ entity, op: 'put', record } as Change)
    }
  }
  if (snapshot.simulationState.length !== 1) {
    throw new InvalidCommandError('A demo snapshot needs exactly one SimulationState row')
  }

  return {
    events: [
      {
        id: eventId,
        type: 'DemoSeeded',
        occurredAt: anchorAt,
        actor,
        entityType: 'SimulationState',
        entityId: 'current',
        payload: { seed, profileId, anchorAt, counts },
      },
    ],
    changes,
  }
}
