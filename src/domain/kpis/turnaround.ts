import type { HospitalEvent, IsoDateTime } from '@/domain/schemas'
import { HOSPITAL_TIME_ZONE, zonedClock } from '@/lib/time'

export type Turnaround = {
  /** Median minutes from discharge to cleaned, in ms; `null` without data. */
  medianMs: number | null
  /** Cleanings finished today that could be paired with their discharge. */
  count: number
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/**
 * Bed turnaround (`specs/domain.md` → KPIs): for every `BedCleaningFinished` of the local day of
 * `now`, the time since the latest earlier `PatientDischarged` of the same bed. Unpaired cleanings
 * (discharge outside the loaded events, or a cleaning after a block) are ignored. Only beds in
 * `bedIds` count. Events may come in any order.
 */
export function bedTurnaround(input: {
  events: readonly HospitalEvent[]
  bedIds: ReadonlySet<string>
  now: IsoDateTime
}): Turnaround {
  const { events, bedIds, now } = input
  const today = zonedClock(now, HOSPITAL_TIME_ZONE).date
  const lastDischarge = new Map<string, number>()
  const durations: number[] = []

  for (const event of [...events].sort((a, b) => a.seq - b.seq)) {
    if (event.type === 'PatientDischarged') {
      if (bedIds.has(event.payload.bedId)) {
        lastDischarge.set(event.payload.bedId, Date.parse(event.occurredAt))
      }
    } else if (event.type === 'BedCleaningFinished' && bedIds.has(event.entityId)) {
      const discharged = lastDischarge.get(event.entityId)
      if (discharged === undefined) continue
      lastDischarge.delete(event.entityId)
      if (zonedClock(event.occurredAt, HOSPITAL_TIME_ZONE).date === today) {
        durations.push(Date.parse(event.occurredAt) - discharged)
      }
    }
  }
  return { medianMs: median(durations), count: durations.length }
}
