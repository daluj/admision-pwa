/**
 * Adapter contract: the same behavioural suite runs against every DataBackend implementation.
 * Imported only by `*.contract.test.ts` files.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppendError, type Change, type DataBackend, type Subscribable } from '@/data/ports'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { ENTITY_NAMES, type Bed, type EventType, type NewHospitalEvent } from '@/domain/schemas'

export type BackendFactory = () => DataBackend | Promise<DataBackend>

let eventCounter = 0

/** A valid `BedBlocked` / `BedUnblocked` event for `bedId` (unique id per call). */
function bedEvent(
  bedId: string,
  type: Extract<EventType, 'BedBlocked' | 'BedUnblocked'> = 'BedUnblocked',
): NewHospitalEvent {
  eventCounter++
  const common = {
    id: `evt-${eventCounter}-${Math.random().toString(36).slice(2)}`,
    occurredAt: '2026-10-20T08:00:00.000Z',
    actor: 'simulator',
    entityType: 'Bed',
    entityId: bedId,
  } as const
  return type === 'BedBlocked'
    ? { ...common, type, payload: { reason: 'Avería' } }
    : { ...common, type, payload: {} }
}

function bed(id: string, unitId = 'unit-a', overrides: Partial<Bed> = {}): Bed {
  return { ...sampleEntities.bed, id, unitId, label: id.toUpperCase(), ...overrides }
}

const putBed = (record: Bed): Change => ({ entity: 'bed', op: 'put', record })

/** Collects every value a Subscribable emits until `stop()` is called. */
function record<T>(subscribable: Subscribable<T>) {
  const values: T[] = []
  const errors: unknown[] = []
  const stop = subscribable.subscribe(
    (value) => values.push(value),
    (error) => errors.push(error),
  )
  return {
    values,
    errors,
    stop,
    last: () => values[values.length - 1],
    /** Waits until the latest emitted value satisfies `predicate`. */
    until: (predicate: (value: T) => boolean) =>
      vi.waitFor(() => {
        expect(values.length).toBeGreaterThan(0)
        expect(predicate(values[values.length - 1] as T)).toBe(true)
      }),
  }
}

export function runBackendContract(name: string, factory: BackendFactory) {
  describe(`DataBackend contract: ${name}`, () => {
    let backend: DataBackend

    beforeEach(async () => {
      backend = await factory()
    })

    afterEach(() => {
      backend.close()
    })

    it('starts empty', async () => {
      for (const entity of ENTITY_NAMES) {
        expect(await backend.repositories[entity].list()).toEqual([])
        expect(await backend.repositories[entity].count()).toBe(0)
      }
      expect(await backend.events.list()).toEqual([])
      expect(await backend.events.lastSeq()).toBe(0)
    })

    it('exposes backend info and a clock', () => {
      expect(backend.info.schemaVersion).toBeGreaterThanOrEqual(1)
      expect(backend.clock.now()).toMatch(/Z$/)
    })

    it('stores a put of every entity and reads it back', async () => {
      const changes = ENTITY_NAMES.map(
        (entity) => ({ entity, op: 'put', record: sampleEntities[entity] }) as Change,
      )
      await backend.events.append([], changes)
      for (const entity of ENTITY_NAMES) {
        const sample = sampleEntities[entity]
        expect(await backend.repositories[entity].get(sample.id)).toEqual(sample)
        expect(await backend.repositories[entity].count()).toBe(1)
      }
    })

    it('assigns consecutive seq values starting at 1 across appends', async () => {
      const first = await backend.events.append([bedEvent('b1'), bedEvent('b1')])
      const second = await backend.events.append([bedEvent('b2')])
      expect(first.map((event) => event.seq)).toEqual([1, 2])
      expect(second.map((event) => event.seq)).toEqual([3])
      expect(await backend.events.lastSeq()).toBe(3)
      expect((await backend.events.list()).map((event) => event.seq)).toEqual([1, 2, 3])
    })

    it('returns stored events equal to what list() reads', async () => {
      const appended = await backend.events.append([bedEvent('b1', 'BedBlocked')])
      expect(await backend.events.list()).toEqual(appended)
      expect(appended[0]).toMatchObject({ type: 'BedBlocked', payload: { reason: 'Avería' } })
    })

    it('commits events and changes together', async () => {
      await backend.events.append(
        [bedEvent('b1', 'BedBlocked')],
        [putBed(bed('b1', 'unit-a', { status: 'BLOCKED', blockedReason: 'Avería' }))],
      )
      expect(await backend.repositories.bed.get('b1')).toMatchObject({ status: 'BLOCKED' })
      expect(await backend.events.lastSeq()).toBe(1)
    })

    it('overwrites on put and removes on delete', async () => {
      await backend.events.append([], [putBed(bed('b1')), putBed(bed('b2'))])
      await backend.events.append([], [putBed(bed('b1', 'unit-a', { label: 'NEW' }))])
      expect(await backend.repositories.bed.get('b1')).toMatchObject({ label: 'NEW' })
      await backend.events.append([], [{ entity: 'bed', op: 'delete', id: 'b2' }])
      expect(await backend.repositories.bed.get('b2')).toBeUndefined()
      expect(await backend.repositories.bed.count()).toBe(1)
    })

    it('returns undefined for a missing id and lists by id order', async () => {
      await backend.events.append([], [putBed(bed('b2')), putBed(bed('b1')), putBed(bed('b3'))])
      expect(await backend.repositories.bed.get('nope')).toBeUndefined()
      expect((await backend.repositories.bed.list()).map((b) => b.id)).toEqual(['b1', 'b2', 'b3'])
    })

    describe('failed appends write nothing', () => {
      beforeEach(async () => {
        await backend.events.append([bedEvent('b0')], [putBed(bed('b0'))])
      })

      async function expectUnchanged() {
        expect(await backend.events.lastSeq()).toBe(1)
        expect((await backend.repositories.bed.list()).map((b) => b.id)).toEqual(['b0'])
      }

      it('rejects an invalid event', async () => {
        const invalid = {
          ...bedEvent('b1'),
          payload: { unexpected: true },
        } as unknown as NewHospitalEvent
        await expect(
          backend.events.append([bedEvent('b1'), invalid], [putBed(bed('b1'))]),
        ).rejects.toBeInstanceOf(AppendError)
        await expectUnchanged()
      })

      it('rejects an invalid record', async () => {
        const invalid = { ...bed('b1'), status: 'DIRTY' } as unknown as Bed
        await expect(
          backend.events.append([bedEvent('b1')], [putBed(bed('b2')), putBed(invalid)]),
        ).rejects.toBeInstanceOf(AppendError)
        await expectUnchanged()
      })

      it('rejects an unknown entity', async () => {
        const unknown = { entity: 'spaceship', op: 'put', record: bed('x') } as unknown as Change
        await expect(
          backend.events.append([bedEvent('b1')], [putBed(bed('b1')), unknown]),
        ).rejects.toBeInstanceOf(AppendError)
        await expectUnchanged()
      })

      it('rejects a duplicate event id', async () => {
        const [stored] = await backend.events.list()
        const duplicate = { ...bedEvent('b1'), id: stored!.id }
        await expect(
          backend.events.append([bedEvent('b1'), duplicate], [putBed(bed('b1'))]),
        ).rejects.toBeInstanceOf(AppendError)
        await expectUnchanged()
      })
    })

    describe('observables', () => {
      it('observeList and observeCount emit the initial value, then after each append', async () => {
        const list = record(backend.repositories.bed.observeList())
        const count = record(backend.repositories.bed.observeCount())
        await list.until((beds) => beds.length === 0)
        await count.until((n) => n === 0)

        await backend.events.append([], [putBed(bed('b1'))])
        await list.until((beds) => beds.length === 1 && beds[0]!.id === 'b1')
        await count.until((n) => n === 1)

        await backend.events.append([], [putBed(bed('b2'))])
        await count.until((n) => n === 2)
        list.stop()
        count.stop()
      })

      it('observeTableCounts covers every table and the event log', async () => {
        const counts = record(backend.observeTableCounts())
        await counts.until((value) => value.events === 0 && value.bed === 0)
        expect(Object.keys(counts.last()!).sort()).toEqual([...ENTITY_NAMES, 'events'].sort())

        await backend.events.append(
          [bedEvent('b1'), bedEvent('b1')],
          [putBed(bed('b1')), { entity: 'unit', op: 'put', record: sampleEntities.unit }],
        )
        await counts.until((value) => value.events === 2 && value.bed === 1 && value.unit === 1)
        counts.stop()
      })

      it('observeRecent returns the newest events first, limited', async () => {
        const recent = record(backend.events.observeRecent(2))
        await recent.until((events) => events.length === 0)
        await backend.events.append([bedEvent('b1'), bedEvent('b2'), bedEvent('b3')])
        await recent.until((events) => events.length === 2)
        expect(recent.last()!.map((event) => event.seq)).toEqual([3, 2])
        recent.stop()
      })

      it('stops emitting after unsubscribe', async () => {
        const count = record(backend.repositories.bed.observeCount())
        await count.until((n) => n === 0)
        count.stop()
        const emitted = count.values.length

        await backend.events.append([], [putBed(bed('b1'))])
        // Give any (wrongly) pending emission a chance to arrive.
        await new Promise((resolve) => setTimeout(resolve, 50))
        expect(count.values.length).toBe(emitted)
      })
    })

    describe('bed queries', () => {
      beforeEach(async () => {
        await backend.events.append(
          [],
          [putBed(bed('a2', 'unit-a')), putBed(bed('a1', 'unit-a')), putBed(bed('b1', 'unit-b'))],
        )
      })

      it('listBedsByUnit filters by unit', async () => {
        expect((await backend.repositories.bed.listBedsByUnit('unit-a')).map((b) => b.id)).toEqual([
          'a1',
          'a2',
        ])
        expect(await backend.repositories.bed.listBedsByUnit('unit-z')).toEqual([])
      })

      it('observeBedsByUnit only reacts to its unit', async () => {
        const unitB = record(backend.repositories.bed.observeBedsByUnit('unit-b'))
        await unitB.until((beds) => beds.length === 1)
        await backend.events.append([], [putBed(bed('b2', 'unit-b'))])
        await unitB.until((beds) => beds.map((b) => b.id).join() === 'b1,b2')
        unitB.stop()
      })
    })

    describe('list options', () => {
      beforeEach(async () => {
        await backend.events.append([1, 2, 3, 4, 5].map(() => bedEvent('b1')))
      })

      it('supports afterSeq and limit', async () => {
        const seqs = async (options: Parameters<DataBackend['events']['list']>[0]) =>
          (await backend.events.list(options)).map((event) => event.seq)
        expect(await seqs({ afterSeq: 3 })).toEqual([4, 5])
        expect(await seqs({ limit: 2 })).toEqual([1, 2])
        expect(await seqs({ afterSeq: 1, limit: 2 })).toEqual([2, 3])
        expect(await seqs({ afterSeq: 5 })).toEqual([])
      })
    })
  })
}
