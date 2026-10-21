import type { EntityType, EventType, HospitalEvent } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { formatDateTime } from '@/lib/time'

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

const details = es.pages.settings.eventLog.details
const reasonText = (reason: string) => details.reasonCodes[reason] ?? reason

/** Short Spanish description of what an event adds (empty when the type says it all). */
export function eventSummary(event: HospitalEvent): string {
  switch (event.type) {
    case 'EdPatientArrived':
      return event.payload.chiefComplaint
    case 'EdPatientTriaged':
      return details.triage(event.payload.triageLevel)
    case 'AdmissionDecided':
      return details.specialty(event.payload.targetSpecialtyCode)
    case 'EdPatientLeft':
      return details.outcomes[event.payload.outcome]
    case 'ScheduledAdmissionCreated':
      return `${details.specialty(event.payload.specialtyCode)} · ${formatDateTime(event.payload.scheduledFor)}`
    case 'BedRequested':
      return details.bedRequest(
        event.payload.priority,
        details.unitTypes[event.payload.requiredUnitType],
      )
    case 'BedBlocked':
      return details.reason(reasonText(event.payload.reason))
    case 'BedReservationReleased':
      return event.payload.reason ? details.reason(reasonText(event.payload.reason)) : ''
    case 'ExpectedDischargeSet':
      return formatDateTime(event.payload.expectedDischargeAt)
    case 'TransferRequested':
      return `${details.transferReasons[event.payload.reason]} · ${details.transferPriorities[event.payload.priority]}`
    case 'TransferCancelled':
      return event.payload.reason ? details.reason(reasonText(event.payload.reason)) : ''
    case 'AdmissionCancelled':
      return details.cancelReasons[event.payload.reason]
    case 'SimulationSpeedChanged':
      return details.speed(event.payload.speed)
    case 'DemoSeeded':
      return details.seed(event.payload.seed)
    default:
      return ''
  }
}
