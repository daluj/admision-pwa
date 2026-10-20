import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createBackend, UnknownBackendError } from './createBackend'

describe('createBackend', () => {
  it('defaults to dexie', () => {
    const backend = createBackend(undefined)
    expect(backend.info).toEqual({ name: 'dexie', schemaVersion: 1 })
    backend.close()
    expect(createBackend('').info.name).toBe('dexie')
  })

  it('creates the memory backend', () => {
    expect(createBackend('memory').info.name).toBe('memory')
  })

  it('rejects an unknown backend', () => {
    expect(() => createBackend('foo')).toThrow(UnknownBackendError)
    expect(() => createBackend('foo')).toThrow(/dexie, memory/)
  })
})
