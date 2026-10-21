import { useMemo } from 'react'
import { useRecentEvents, useSimNow } from '@/data/hooks'
import { bedTurnaround, type Turnaround } from '@/domain/kpis'

/** Enough to cover a simulated day of activity; Phase 14 revisits this with indexes. */
export const TURNAROUND_EVENT_WINDOW = 5000

/** Bed turnaround of the given beds, live; `undefined` while loading. */
export function useTurnaround(bedIds: ReadonlySet<string>): Turnaround | undefined {
  const events = useRecentEvents(TURNAROUND_EVENT_WINDOW)
  const now = useSimNow()
  return useMemo(
    () => (events && now ? bedTurnaround({ events, bedIds, now }) : undefined),
    [events, bedIds, now],
  )
}
