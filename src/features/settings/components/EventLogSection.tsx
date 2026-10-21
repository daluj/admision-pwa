import { useMemo, useState } from 'react'
import { useRecentEvents, useSimulationState, useUsers } from '@/data/hooks'
import { EventLogCard } from './EventLogCard'

export const EVENT_PAGE_SIZE = 100

/** Container: live latest events (newest first); "Cargar más" widens the loaded window. */
export function EventLogSection() {
  const [limit, setLimit] = useState(EVENT_PAGE_SIZE)
  const events = useRecentEvents(limit)
  const state = useSimulationState()
  const users = useUsers()
  const actors = useMemo(
    () => new Map((users ?? []).map((user) => [user.id, user.displayName])),
    [users],
  )
  return (
    <EventLogCard
      events={events}
      simNow={state?.simNow}
      actors={actors}
      canLoadMore={events !== undefined && events.length >= limit}
      onLoadMore={() => setLimit((current) => current + EVENT_PAGE_SIZE)}
    />
  )
}
