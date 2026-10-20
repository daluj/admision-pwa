export type Unsubscribe = () => void

/**
 * A push-based observable value. `subscribe` emits the current value as soon as it is known and
 * again after every change. Implemented by every adapter (Dexie liveQuery, memory, later Supabase
 * Realtime) so the UI never depends on a storage library.
 */
export type Subscribable<T> = {
  subscribe: (onValue: (value: T) => void, onError?: (error: unknown) => void) => Unsubscribe
}

/** A Subscribable that emits one constant value (handy in tests and stories). */
export function fromValue<T>(value: T): Subscribable<T> {
  return {
    subscribe: (onValue) => {
      onValue(value)
      return () => {}
    },
  }
}
