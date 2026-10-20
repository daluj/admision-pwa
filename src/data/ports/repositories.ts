import type { Bed, EntityName, EntityOf, Id } from '@/domain/schemas'
import type { Subscribable } from './subscribable'

/** Read access to one entity's current state. Writes go through EventStore.append. */
export type Repository<T> = {
  get: (id: Id) => Promise<T | undefined>
  list: () => Promise<T[]>
  observeList: () => Subscribable<T[]>
  count: () => Promise<number>
  observeCount: () => Subscribable<number>
}

export type BedRepository = Repository<Bed> & {
  listBedsByUnit: (unitId: Id) => Promise<Bed[]>
  observeBedsByUnit: (unitId: Id) => Subscribable<Bed[]>
}

/** One repository per entity, keyed by entity name. */
export type Repositories = { [N in EntityName]: Repository<EntityOf<N>> } & {
  bed: BedRepository
}
