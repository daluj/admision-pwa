import { useState } from 'react'
import { useRecentEvents, useSimulationState } from '@/data/hooks'
import { EventLogCard } from './EventLogCard'

export const EVENT_PAGE_SIZE = 100

/** Container: live latest events (newest first); "Cargar más" widens the loaded window. */
export function EventLogSection() {
  const [limit, setLimit] = useState(EVENT_PAGE_SIZE)
  const events = useRecentEvents(limit)
  const state = useSimulationState()
  return (
    <EventLogCard
      events={events}
      simNow={state?.simNow}
      canLoadMore={events !== undefined && events.length >= limit}
      onLoadMore={() => setLimit((current) => current + EVENT_PAGE_SIZE)}
    />
  )
}
