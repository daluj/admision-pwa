import type { EntityName } from '@/domain/schemas'
import type { Clock } from './clock'
import type { EventStore } from './eventStore'
import type { Repositories } from './repositories'
import type { Subscribable } from './subscribable'

export type BackendName = 'dexie' | 'memory'

export type DataBackendInfo = {
  name: BackendName
  /** Storage schema version (Dexie `db.version(n)`; 1 for the memory adapter). */
  schemaVersion: number
}

/** Row count per entity table plus the event log. */
export type TableCounts = Record<EntityName | 'events', number>

/** Everything the app needs from persistence. One instance per app (see DataProvider). */
export type DataBackend = {
  info: DataBackendInfo
  repositories: Repositories
  events: EventStore
  clock: Clock
  observeTableCounts: () => Subscribable<TableCounts>
  close: () => void
}
