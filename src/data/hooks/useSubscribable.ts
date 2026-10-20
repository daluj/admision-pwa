import { useMemo, useSyncExternalStore } from 'react'
import type { Subscribable, Unsubscribe } from '@/data/ports'

type Snapshot<T> = { value: T | undefined; failure: { error: unknown } | null }

type Store<T> = {
  subscribe: (listener: () => void) => Unsubscribe
  getSnapshot: () => Snapshot<T>
}

const INITIAL: Snapshot<never> = { value: undefined, failure: null }

/** Shares one upstream subscription between React listeners; subscribes lazily, unsubscribes when idle. */
function createStore<T>(source: Subscribable<T>): Store<T> {
  let snapshot: Snapshot<T> = INITIAL
  let upstream: Unsubscribe | null = null
  const listeners = new Set<() => void>()
  const publish = (next: Snapshot<T>) => {
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  return {
    subscribe: (listener) => {
      listeners.add(listener)
      upstream ??= source.subscribe(
        (value) => publish({ value, failure: null }),
        (error) => publish({ value: snapshot.value, failure: { error } }),
      )
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0 && upstream) {
          upstream()
          upstream = null
        }
      }
    },
    getSnapshot: () => snapshot,
  }
}

/**
 * Subscribes a component to a Subscribable. Returns `undefined` until the first value arrives.
 * Errors are rethrown during render so the nearest error boundary handles them.
 * Pass a memoised Subscribable (a new one re-subscribes).
 */
export function useSubscribable<T>(source: Subscribable<T>): T | undefined {
  const store = useMemo(() => createStore(source), [source])
  const { value, failure } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )
  if (failure) throw failure.error
  return value
}
