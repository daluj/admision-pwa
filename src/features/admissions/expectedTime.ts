import { addMinutes, HOSPITAL_TIME_ZONE, zonedClock, zonedDayAt } from '@/lib/time'

/** The three days an expected discharge can be set for from the sheet: today, tomorrow, the day after. */
export const DAY_OFFSETS = [0, 1, 2] as const

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (minuteOfDay: number) =>
  `${pad(Math.floor(minuteOfDay / 60))}:${pad(minuteOfDay % 60)}`

/** Local `HH:mm` of an instant. */
export function localTimeOf(iso: string): string {
  return hhmm(zonedClock(iso, HOSPITAL_TIME_ZONE).minuteOfDay)
}

/**
 * Local day offset (0 = today of `now`) of `iso`, or `null` when it is not one of the offered days.
 * Anchored at local noon so a 23 h / 25 h day never shifts the result.
 */
export function dayOffsetOf(iso: string, now: string): number | null {
  const today = zonedDayAt(now, HOSPITAL_TIME_ZONE, 12)
  for (const offset of DAY_OFFSETS) {
    const day = zonedClock(addMinutes(today, offset * 1440), HOSPITAL_TIME_ZONE).date
    if (zonedClock(iso, HOSPITAL_TIME_ZONE).date === day) return offset
  }
  return null
}

/** The instant for `HH:mm` local time on day `offset` after today. `null` if the time is malformed. */
export function toInstant(now: string, offset: number, time: string): string | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!match) return null
  const noon = zonedDayAt(now, HOSPITAL_TIME_ZONE, 12)
  return zonedDayAt(
    addMinutes(noon, offset * 1440),
    HOSPITAL_TIME_ZONE,
    Number(match[1]),
    Number(match[2]),
  )
}

/** Next full local hour after `now`, as `{ offset, time }` (rolls over to tomorrow late at night). */
export function nextFullHour(now: string): { offset: number; time: string } {
  const { minuteOfDay } = zonedClock(now, HOSPITAL_TIME_ZONE)
  const next = Math.floor(minuteOfDay / 60) * 60 + 60
  return next >= 24 * 60 ? { offset: 1, time: '08:00' } : { offset: 0, time: hhmm(next) }
}
