import type { EntityName, EntityOf, HospitalEvent, Id, NewHospitalEvent } from '@/domain/schemas'
import type { Subscribable } from './subscribable'

/** A state change persisted together with the events that caused it. */
export type Change = {
  [N in EntityName]:
    { entity: N; op: 'put'; record: EntityOf<N> } | { entity: N; op: 'delete'; id: Id }
}[EntityName]

export type ListEventsOptions = {
  /** Only events with `seq` greater than this. */
  afterSeq?: number
  limit?: number
}

export type AppendOptions = {
  /**
   * Optimistic concurrency: reject with ConcurrencyError unless the store's last `seq` equals this
   * value (checked inside the write transaction). `0` means "only if the store is empty".
   */
  expectedLastSeq?: number
}

/**
 * Append-only event log. `append` writes the events (assigning consecutive `seq` values) and the
 * state `changes` in ONE transaction: either everything is stored or nothing is.
 */
export type EventStore = {
  append: (
    events: readonly NewHospitalEvent[],
    changes?: readonly Change[],
    options?: AppendOptions,
  ) => Promise<HospitalEvent[]>
  /**
   * Replaces EVERYTHING in one transaction: wipes every entity table and the event log, then writes
   * `events` (seq restarts at 1) and `changes`. Used by "Restablecer demo". Atomic like `append`.
   */
  reset: (
    events: readonly NewHospitalEvent[],
    changes?: readonly Change[],
  ) => Promise<HospitalEvent[]>
  /** Events in ascending `seq` order. */
  list: (options?: ListEventsOptions) => Promise<HospitalEvent[]>
  /** The latest `limit` events, newest first. */
  observeRecent: (limit: number) => Subscribable<HospitalEvent[]>
  /** Highest stored `seq`, or 0 when empty. */
  lastSeq: () => Promise<number>
}

/** Thrown when an append is rejected (invalid event/record, unknown entity). Nothing was written. */
export class AppendError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AppendError'
  }
}

/** `expectedLastSeq` did not match: someone else wrote first. Nothing was written. */
export class ConcurrencyError extends AppendError {
  readonly expected: number
  readonly actual: number

  constructor(expected: number, actual: number) {
    super(`Concurrent write: expected last seq ${expected}, found ${actual}`)
    this.name = 'ConcurrencyError'
    this.expected = expected
    this.actual = actual
  }
}
