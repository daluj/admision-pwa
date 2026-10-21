import type { EntityType, EventType, HospitalEvent } from '@/domain/schemas'

export const WINDOWS = ['1h', '6h', '24h', 'all'] as const
export type EventWindow = (typeof WINDOWS)[number]

export type EventLogFilters = {
  type: EventType | 'all'
  entity: EntityType | 'all'
  window: EventWindow
}

export const DEFAULT_FILTERS: EventLogFilters = { type: 'all', entity: 'all', window: 'all' }

const WINDOW_MS: Record<Exclude<EventWindow, 'all'>, number> = {
  '1h': 3_600_000,
  '6h': 6 * 3_600_000,
  '24h': 24 * 3_600_000,
}

/**
 * Events matching the filters. The time window ends at `now` (the simulated time, or the newest
 * event when there is no simulation clock yet), never at the wall clock.
 */
export function filterEvents(
  events: readonly HospitalEvent[],
  filters: EventLogFilters,
  now: string | undefined,
): HospitalEvent[] {
  const reference = now ?? events[0]?.occurredAt
  const since =
    filters.window === 'all' || !reference
      ? undefined
      : Date.parse(reference) - WINDOW_MS[filters.window]
  return events.filter(
    (event) =>
      (filters.type === 'all' || event.type === filters.type) &&
      (filters.entity === 'all' || event.entityType === filters.entity) &&
      (since === undefined || Date.parse(event.occurredAt) >= since),
  )
}

const MAX_VALUE_LENGTH = 40

/** Short human-readable payload: primitive fields only, long ids left out. */
export function eventSummary(event: HospitalEvent): string {
  const payload = event.payload as Record<string, unknown>
  switch (event.type) {
    case 'EdPatientTriaged':
      return `Nivel ${event.payload.triageLevel}`
    case 'SimulationSpeedChanged':
      return `${event.payload.speed}×`
    case 'DemoSeeded':
      return `Semilla ${event.payload.seed}`
    default:
      return Object.entries(payload)
        .filter(
          ([, value]) =>
            (typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean') &&
            String(value).length <= MAX_VALUE_LENGTH,
        )
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(' · ')
  }
}
