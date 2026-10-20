import { liveQuery } from 'dexie'
import { systemClock } from '@/data/adapters/clock/systemClock'
import { VALIDATE_SCHEMAS_DEFAULT, validateAppend } from '@/data/adapters/validation'
import {
  AppendError,
  type BedRepository,
  type Clock,
  type DataBackend,
  type EventStore,
  type Repositories,
  type Repository,
  type Subscribable,
  type TableCounts,
} from '@/data/ports'
import { ENTITY_NAMES, type EntityName, type EntityOf, type HospitalEvent } from '@/domain/schemas'
import { DATABASE_NAME, SCHEMA_VERSION, TorreControlDb } from './db'

export type DexieBackendOptions = {
  /** Database name; tests pass a unique name per case. */
  name?: string
  clock?: Clock
  validateSchemas?: boolean
}

/** Wraps a Dexie live query (live across tabs) as a storage-agnostic Subscribable. */
function live<T>(query: () => Promise<T>): Subscribable<T> {
  return {
    subscribe: (onValue, onError) => {
      const subscription = liveQuery(query).subscribe({
        next: onValue,
        error: (error: unknown) => onError?.(error),
      })
      return () => subscription.unsubscribe()
    },
  }
}

/** IndexedDB DataBackend (database `torre-control`). */
export function createDexieBackend(options: DexieBackendOptions = {}): DataBackend {
  const {
    name = DATABASE_NAME,
    clock = systemClock,
    validateSchemas = VALIDATE_SCHEMAS_DEFAULT,
  } = options
  const db = new TorreControlDb(name)

  function repository<N extends EntityName>(entity: N): Repository<EntityOf<N>> {
    const table = () => db.entityTable(entity)
    return {
      get: (id) => table().get(id),
      list: () => table().toArray(),
      observeList: () => live(() => table().toArray()),
      count: () => table().count(),
      observeCount: () => live(() => table().count()),
    }
  }

  const bedsByUnit = (unitId: string) =>
    db.entityTable('bed').where('unitId').equals(unitId).toArray()
  const bed: BedRepository = {
    ...repository('bed'),
    listBedsByUnit: bedsByUnit,
    observeBedsByUnit: (unitId) => live(() => bedsByUnit(unitId)),
  }

  const repositories = {
    ...(Object.fromEntries(
      ENTITY_NAMES.map((entity) => [entity, repository(entity)]),
    ) as Repositories),
    bed,
  } satisfies Repositories

  const lastSeq = async () => (await db.events.orderBy('seq').last())?.seq ?? 0

  const eventStore: EventStore = {
    append: async (newEvents, changes = []) => {
      validateAppend(newEvents, changes, { validateSchemas })
      const tables = [...ENTITY_NAMES.map((entity) => db.entityTable(entity)), db.events]
      try {
        return await db.transaction('rw', tables, async () => {
          let seq = await lastSeq()
          const appended: HospitalEvent[] = newEvents.map((event) => ({ ...event, seq: ++seq }))
          if (appended.length > 0) await db.events.bulkAdd(appended)
          for (const change of changes) {
            const table = db.entityTable(change.entity)
            if (change.op === 'put') await table.put(change.record as never)
            else await table.delete(change.id)
          }
          return appended
        })
      } catch (error) {
        if (error instanceof AppendError) throw error
        const message = error instanceof Error ? error.message : String(error)
        throw new AppendError(`Append failed: ${message}`, { cause: error })
      }
    },
    list: async ({ afterSeq = 0, limit } = {}) => {
      const query = db.events.where('seq').above(afterSeq)
      return limit === undefined ? query.toArray() : query.limit(limit).toArray()
    },
    observeRecent: (limit) => live(() => db.events.orderBy('seq').reverse().limit(limit).toArray()),
    lastSeq,
  }

  const tableCounts = async (): Promise<TableCounts> => {
    const counts = await Promise.all(ENTITY_NAMES.map((entity) => db.entityTable(entity).count()))
    return {
      ...(Object.fromEntries(ENTITY_NAMES.map((entity, i) => [entity, counts[i]])) as Record<
        EntityName,
        number
      >),
      events: await db.events.count(),
    }
  }

  return {
    info: { name: 'dexie', schemaVersion: SCHEMA_VERSION },
    repositories,
    events: eventStore,
    clock,
    observeTableCounts: () => live(tableCounts),
    close: () => db.close(),
  }
}
