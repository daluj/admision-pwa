import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { runBackendContract } from '@/data/adapters/contract'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { createDexieBackend } from './createDexieBackend'
import { UNIQUE_FIELDS } from '@/data/ports'
import { SCHEMA_VERSION, STORES_V1, TABLE_NAMES, TorreControlDb } from './db'

let counter = 0
const uniqueName = () => `torre-control-test-${++counter}-${Date.now()}`

runBackendContract('dexie (fake-indexeddb)', () =>
  createDexieBackend({ name: uniqueName(), clock: createFixedClock(), validateSchemas: true }),
)

describe('Dexie adapter specifics', () => {
  it('declares a table for every entity plus events, at schema version 1', () => {
    expect(SCHEMA_VERSION).toBe(1)
    expect(Object.keys(STORES_V1).sort()).toEqual([...Object.values(TABLE_NAMES), 'events'].sort())
  })

  it('declares a unique index for every UNIQUE_FIELDS entry', () => {
    for (const [entity, fields] of Object.entries(UNIQUE_FIELDS)) {
      const store: string = STORES_V1[TABLE_NAMES[entity as keyof typeof TABLE_NAMES]]
      for (const field of fields) expect(store.split(', ')).toContain(`&${field}`)
    }
  })

  it('creates every table with the indexes from the plan', async () => {
    const db = new TorreControlDb(uniqueName())
    await db.open()
    const beds = db.table('beds').schema
    expect(beds.primKey.name).toBe('id')
    expect(beds.indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining(['unitId', 'status', '[unitId+status]']),
    )
    expect(db.tables).toHaveLength(13)
    db.close()
  })

  it('a second connection to the same database sees appended data', async () => {
    const name = uniqueName()
    const writer = createDexieBackend({ name, validateSchemas: true })
    await writer.events.append(
      [
        {
          id: '00000000-0000-4000-8000-000000000001',
          type: 'BedUnblocked',
          occurredAt: '2026-10-20T08:00:00.000Z',
          actor: 'simulator',
          entityType: 'Bed',
          entityId: sampleEntities.bed.id,
          payload: {},
        },
      ],
      [{ entity: 'bed', op: 'put', record: sampleEntities.bed }],
    )
    writer.close()

    const reader = createDexieBackend({ name })
    expect(await reader.repositories.bed.get(sampleEntities.bed.id)).toEqual(sampleEntities.bed)
    expect(await reader.events.lastSeq()).toBe(1)
    reader.close()
  })
})
