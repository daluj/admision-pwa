import { createDexieBackend } from '@/data/adapters/dexie/createDexieBackend'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { BackendName, DataBackend } from '@/data/ports'

export const BACKEND_NAMES = ['dexie', 'memory'] as const satisfies readonly BackendName[]

export class UnknownBackendError extends Error {
  readonly value: string

  constructor(value: string) {
    super(`Unknown VITE_DATA_BACKEND "${value}". Expected one of: ${BACKEND_NAMES.join(', ')}`)
    this.name = 'UnknownBackendError'
    this.value = value
  }
}

function isBackendName(value: string): value is BackendName {
  return (BACKEND_NAMES as readonly string[]).includes(value)
}

/**
 * The only place that chooses and constructs an adapter. Defaults to `dexie`.
 * Throws UnknownBackendError for any other value.
 */
export function createBackend(
  value: string | undefined = import.meta.env.VITE_DATA_BACKEND,
): DataBackend {
  const name = value === undefined || value === '' ? 'dexie' : value
  if (!isBackendName(name)) throw new UnknownBackendError(name)
  return name === 'dexie' ? createDexieBackend() : createMemoryBackend()
}
