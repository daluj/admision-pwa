import { useMemo } from 'react'

/**
 * A `Set` of ids that keeps its identity while the ids stay the same, so memoised work that
 * depends on it (the turnaround) is not redone on every live update of unrelated data.
 */
export function useBedIdSet(ids: readonly string[]): ReadonlySet<string> {
  const key = ids.join('\u0000')
  return useMemo(() => new Set(key === '' ? [] : key.split('\u0000')), [key])
}
