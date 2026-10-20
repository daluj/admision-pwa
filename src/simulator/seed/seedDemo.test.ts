import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { createDexieBackend } from '@/data/adapters/dexie/createDexieBackend'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { DataBackend } from '@/data/ports'
import { ENTITY_NAMES } from '@/domain/schemas'
import { InvalidCommandError, resetDemo as resetDemoCommand } from '@/domain/commands'
import { generateHospital } from './generateHospital'
import { demoAnchor, ensureDemoSeeded, resetDemo } from './seedDemo'

const NOW = '2026-10-20T15:42:00.000Z' // 17:42 Madrid → anchor 08:00 Madrid
const ANCHOR = '2026-10-20T06:00:00.000Z'

let counter = 0
const factories: Array<[string, () => DataBackend]> = [
  ['memory', () => createMemoryBackend({ clock: createFixedClock(NOW), validateSchemas: true })],
  [
    'dexie',
    () =>
      createDexieBackend({
        name: `seed-test-${++counter}-${Date.now()}`,
        clock: createFixedClock(NOW),
        validateSchemas: true,
      }),
  ],
]

async function dump(backend: DataBackend) {
  return Object.fromEntries(
    await Promise.all(
      ENTITY_NAMES.map(async (name) => [name, await backend.repositories[name].list()] as const),
    ),
  )
}

describe('resetDemo command', () => {
  it('produces one DemoSeeded event and a put per row', () => {
    const snapshot = generateHospital({ seed: 42, anchorAt: ANCHOR })
    const { events, changes } = resetDemoCommand({
      snapshot,
      seed: 42,
      profileId: 'tertiary-600',
      anchorAt: ANCHOR,
      eventId: '00000000-0000-4000-8000-000000000001',
    })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'DemoSeeded',
      entityType: 'SimulationState',
      entityId: 'current',
      occurredAt: ANCHOR,
      payload: { seed: 42, profileId: 'tertiary-600', anchorAt: ANCHOR },
    })
    const total = ENTITY_NAMES.reduce((sum, name) => sum + snapshot[name].length, 0)
    expect(changes).toHaveLength(total)
    expect(changes.every((c) => c.op === 'put')).toBe(true)
    expect(events[0]!.type === 'DemoSeeded' && events[0]!.payload.counts.bed).toBe(600)
  })

  it('rejects an invalid record', () => {
    const snapshot = generateHospital({ seed: 1, anchorAt: ANCHOR })
    snapshot.bed[0] = { ...snapshot.bed[0]!, status: 'DIRTY' as never }
    expect(() =>
      resetDemoCommand({
        snapshot,
        seed: 1,
        profileId: 'x',
        anchorAt: ANCHOR,
        eventId: '00000000-0000-4000-8000-000000000001',
      }),
    ).toThrow(InvalidCommandError)
  })
})

describe.each(factories)('seed service on %s', (_name, factory) => {
  let backend: DataBackend
  afterEach(() => backend?.close())

  it('anchors the demo at 08:00 Madrid of the clock day', () => {
    backend = factory()
    expect(demoAnchor(backend)).toBe(ANCHOR)
  })

  it('ensureDemoSeeded seeds once with exactly one event, then is a no-op', async () => {
    backend = factory()
    expect(await ensureDemoSeeded(backend)).toBe('seeded')
    expect(await backend.events.lastSeq()).toBe(1)
    const [event] = await backend.events.list()
    expect(event).toMatchObject({ seq: 1, type: 'DemoSeeded', payload: { seed: 42 } })
    expect(await backend.repositories.bed.count()).toBe(600)
    const before = await dump(backend)

    expect(await ensureDemoSeeded(backend)).toBe('already-seeded')
    expect(await backend.events.lastSeq()).toBe(1)
    expect(await dump(backend)).toEqual(before)
  })

  it('concurrent first launches seed only once', async () => {
    backend = factory()
    const results = await Promise.all([ensureDemoSeeded(backend), ensureDemoSeeded(backend)])
    expect([...results].sort()).toEqual(['already-seeded', 'seeded'])
    expect(await backend.events.lastSeq()).toBe(1)
    expect(await backend.repositories.bed.count()).toBe(600)
  })

  it('resetDemo replaces everything; same seed ⇒ same data', async () => {
    backend = factory()
    await ensureDemoSeeded(backend, 42)
    const original = await dump(backend)

    await resetDemo(backend, 7)
    expect(await backend.events.lastSeq()).toBe(1)
    expect((await backend.events.list())[0]).toMatchObject({ payload: { seed: 7 } })
    const reseeded = await dump(backend)
    expect(reseeded.patient).not.toEqual(original.patient)
    expect(reseeded.simulationState).toEqual([expect.objectContaining({ seed: 7 })])

    await resetDemo(backend, 42)
    expect(await dump(backend)).toEqual(original)
    expect(await backend.events.lastSeq()).toBe(1)
  })

  it('rejects an invalid seed', async () => {
    backend = factory()
    await expect(resetDemo(backend, -1)).rejects.toThrow(RangeError)
    await expect(resetDemo(backend, 1.5)).rejects.toThrow(RangeError)
    await expect(resetDemo(backend, 1_000_000)).rejects.toThrow(RangeError)
  })
})
