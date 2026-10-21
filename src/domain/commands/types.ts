import type { Change, Repositories } from '@/data/ports'
import {
  entityTypeOf,
  type Actor,
  type EntityName,
  type EntityOf,
  type EventOfType,
  type EventType,
  type Id,
  type IsoDateTime,
  type NewHospitalEvent,
} from '@/domain/schemas'

/** What every domain command returns: events + the state changes they cause, to append together. */
export type CommandResult = {
  events: NewHospitalEvent[]
  changes: Change[]
}

/** Thrown when command input is invalid or refers to something that does not exist. Nothing is written. */
export class InvalidCommandError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'InvalidCommandError'
  }
}

/** Everything a command needs: read access to current state, the time, ids and who acts. */
export type CommandContext = {
  repositories: Repositories
  /** "Now" from the (simulated) Clock. */
  now: IsoDateTime
  /** New unique id (events and new entities). */
  newId: () => string
  actor: Actor
}

/** A command reads state through `ctx` and returns the events and changes to persist together. */
export type Command<Input> = (ctx: CommandContext, input: Input) => Promise<CommandResult>

/** Loads an entity or rejects the command. */
export async function requireEntity<N extends EntityName>(
  ctx: CommandContext,
  entity: N,
  id: Id,
): Promise<EntityOf<N>> {
  const row = await ctx.repositories[entity].get(id)
  if (!row) throw new InvalidCommandError(`Unknown ${entity} ${id}`)
  return row as EntityOf<N>
}

/** Builds a typed event stamped with the context's time, actor and a fresh id. */
export function buildEvent<T extends EventType>(
  ctx: CommandContext,
  type: T,
  entityId: Id,
  payload: EventOfType<T, NewHospitalEvent>['payload'],
): NewHospitalEvent {
  return {
    id: ctx.newId(),
    type,
    occurredAt: ctx.now,
    actor: ctx.actor,
    entityType: entityTypeOf(type),
    entityId,
    payload,
  } as NewHospitalEvent
}

/** `put` change for a row, with `updatedAt` set to the command time. */
export function putChange<N extends EntityName>(
  ctx: CommandContext,
  entity: N,
  record: EntityOf<N>,
): Change {
  return { entity, op: 'put', record: { ...record, updatedAt: ctx.now } } as Change
}
