import { systemClock } from '@/data/adapters/clock/systemClock'
import { VALIDATE_SCHEMAS_DEFAULT, validateAppend } from '@/data/adapters/validation'
import {
  AppendError,
  type BedRepository,
  type Change,
  type Clock,
  type DataBackend,
  type EventStore,
  type Repositories,
  type Repository,
  type Subscribable,
  type TableCounts,
} from '@/data/ports'
import {
  ENTITY_NAMES,
  type Bed,
  type EntityName,
  type EntityOf,
  type HospitalEvent,
} from '@/domain/schemas'

/** Rows are validated on append; typed per entity at the read boundary. */
type Tables = Record<EntityName, Map<string, unknown>>

export type MemoryBackendOptions = {
  clock?: Clock
  validateSchemas?: boolean
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** In-memory DataBackend for unit tests and the `memory` backend option. Not persisted. */
export function createMemoryBackend(options: MemoryBackendOptions = {}): DataBackend {
  const { clock = systemClock, validateSchemas = VALIDATE_SCHEMAS_DEFAULT } = options

  let tables = Object.fromEntries(ENTITY_NAMES.map((name) => [name, new Map()])) as Tables
  let events: HospitalEvent[] = []
  const listeners = new Set<() => void>()
  let closed = false

  const notify = () => {
    queueMicrotask(() => {
      for (const listener of [...listeners]) listener()
    })
  }

  /** A Subscribable that recomputes `read()` initially and after every committed append. */
  function live<T>(read: () => T): Subscribable<T> {
    return {
      subscribe: (onValue, onError) => {
        let active = true
        const emit = () => {
          if (!active) return
          try {
            onValue(read())
          } catch (error) {
            onError?.(error)
          }
        }
        listeners.add(emit)
        queueMicrotask(emit)
        return () => {
          active = false
          listeners.delete(emit)
        }
      },
    }
  }

  const rows = <N extends EntityName>(name: N): EntityOf<N>[] =>
    [...(tables[name] as Map<string, EntityOf<N>>).values()]
      .sort(byId)
      .map((r) => structuredClone(r))

  function repository<N extends EntityName>(name: N): Repository<EntityOf<N>> {
    const table = () => tables[name] as Map<string, EntityOf<N>>
    return {
      get: async (id) => {
        const row = table().get(id)
        return row && structuredClone(row)
      },
      list: async () => rows(name),
      observeList: () => live(() => rows(name)),
      count: async () => table().size,
      observeCount: () => live(() => table().size),
    }
  }

  const bedsByUnit = (unitId: string): Bed[] => rows('bed').filter((bed) => bed.unitId === unitId)
  const bed: BedRepository = {
    ...repository('bed'),
    listBedsByUnit: async (unitId) => bedsByUnit(unitId),
    observeBedsByUnit: (unitId) => live(() => bedsByUnit(unitId)),
  }

  const repositories = {
    ...(Object.fromEntries(ENTITY_NAMES.map((name) => [name, repository(name)])) as Repositories),
    bed,
  } satisfies Repositories

  const eventStore: EventStore = {
    append: async (newEvents, changes = []) => {
      if (closed) throw new AppendError('Backend is closed')
      validateAppend(newEvents, changes, { validateSchemas })
      for (const event of newEvents) {
        if (events.some((stored) => stored.id === event.id)) {
          throw new AppendError(`Duplicate event id: ${event.id}`)
        }
      }

      // Copy-on-write: build the next state completely, then swap it in (atomic).
      const nextTables = { ...tables }
      const touched = new Set<EntityName>()
      for (const change of changes as Change[]) {
        if (!touched.has(change.entity)) {
          nextTables[change.entity] = new Map(tables[change.entity])
          touched.add(change.entity)
        }
        const table = nextTables[change.entity]
        if (change.op === 'put') table.set(change.record.id, structuredClone(change.record))
        else table.delete(change.id)
      }
      let seq = events.length === 0 ? 0 : events[events.length - 1]!.seq
      const appended = newEvents.map((event) => ({ ...structuredClone(event), seq: ++seq }))

      tables = nextTables
      events = [...events, ...appended]
      if (appended.length > 0 || changes.length > 0) notify()
      return structuredClone(appended)
    },
    list: async ({ afterSeq = 0, limit } = {}) => {
      const result = events.filter((event) => event.seq > afterSeq)
      return structuredClone(limit === undefined ? result : result.slice(0, limit))
    },
    observeRecent: (limit) => live(() => structuredClone(events.slice(-limit).reverse())),
    lastSeq: async () => events[events.length - 1]?.seq ?? 0,
  }

  const tableCounts = (): TableCounts => ({
    ...(Object.fromEntries(ENTITY_NAMES.map((name) => [name, tables[name].size])) as Record<
      EntityName,
      number
    >),
    events: events.length,
  })

  return {
    info: { name: 'memory', schemaVersion: 1 },
    repositories,
    events: eventStore,
    clock,
    observeTableCounts: () => live(tableCounts),
    close: () => {
      closed = true
      listeners.clear()
    },
  }
}
