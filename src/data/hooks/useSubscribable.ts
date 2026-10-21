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
      // A new subscription starts clean: a failure (or a value) from an earlier life must not
      // be shown again, or a retry after an error would throw the same cached error forever.
      if (!upstream) snapshot = INITIAL
      upstream ??= source.subscribe(
        (value) => publish({ value, failure: null }),
        (error) => publish({ value: snapshot.value, failure: { error } }),
      )
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0 && upstream) {
          upstream()
          upstream = null
          snapshot = INITIAL
        }
      }
    },
    getSnapshot: () => snapshot,
  }
}

/** One store (hence one upstream query) per Subscribable instance, however many components use it. */
const stores = new WeakMap<object, Store<unknown>>()
function storeFor<T>(source: Subscribable<T>): Store<T> {
  let store = stores.get(source) as Store<T> | undefined
  if (!store) {
    store = createStore(source)
    stores.set(source, store)
  }
  return store
}

// One entry per (owner, key); keys are bounded in practice (tables, units, a few event windows).
const sources = new WeakMap<object, Map<string, Subscribable<unknown>>>()

/**
 * The same Subscribable for the same `(owner, key)` every time. Combined with `useSubscribable`
 * this means ONE live query per table (or event window) for the whole app: the top bar, the page,
 * the overview and the alert evaluator all share it instead of each re-reading the table on every change.
 */
export function sharedSource<T>(
  owner: object,
  key: string,
  make: () => Subscribable<T>,
): Subscribable<T> {
  let byKey = sources.get(owner)
  if (!byKey) {
    byKey = new Map()
    sources.set(owner, byKey)
  }
  let source = byKey.get(key) as Subscribable<T> | undefined
  if (!source) {
    source = make()
    byKey.set(key, source)
  }
  return source
}

/**
 * Subscribes a component to a Subscribable. Returns `undefined` until the first value arrives.
 * Errors are rethrown during render so the nearest error boundary handles them.
 * Pass a memoised Subscribable (a new one re-subscribes).
 */
export function useSubscribable<T>(source: Subscribable<T>): T | undefined {
  const store = useMemo(() => storeFor(source), [source])
  const { value, failure } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )
  if (failure) throw failure.error
  return value
}
