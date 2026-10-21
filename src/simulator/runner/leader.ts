export const SIMULATOR_LOCK_NAME = 'torre-control-simulator'

/** The slice of the Web Locks API we use (so tests can fake it). */
export type LockManagerLike = {
  request: (
    name: string,
    options: { signal: AbortSignal },
    callback: () => Promise<void>,
  ) => Promise<unknown>
}

export type Leadership = { stop: () => void }

/**
 * Runs `onLeader` only in the tab that holds the Web Lock; other tabs wait in the queue and take
 * over when the leader closes. `onLeader` returns a cleanup. Without Web Locks the tab is leader.
 */
export function runAsLeader(
  onLeader: () => () => void,
  locks: LockManagerLike | undefined = typeof navigator === 'undefined'
    ? undefined
    : (navigator.locks as LockManagerLike | undefined),
  name: string = SIMULATOR_LOCK_NAME,
): Leadership {
  if (!locks) {
    const cleanup = onLeader()
    return { stop: cleanup }
  }

  const abort = new AbortController()
  locks
    .request(name, { signal: abort.signal }, () => {
      const cleanup = onLeader()
      return new Promise<void>((resolve) => {
        abort.signal.addEventListener('abort', () => {
          cleanup()
          resolve()
        })
      })
    })
    .catch((error: unknown) => {
      // Aborting while still queued rejects with an AbortError: expected on stop().
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('[simulator] leader lock failed', error)
      }
    })
  return { stop: () => abort.abort() }
}
