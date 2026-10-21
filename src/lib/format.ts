import { es } from '@/i18n/es'
import { HOSPITAL_TIME_ZONE, zonedClock } from '@/lib/time'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const copy = es.dashboard

/** "<1 min", "35 min", "2 h 15 min", "3 d 4 h". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, ms)
  if (total < MINUTE) return copy.duration.lessThanMinute
  if (total < HOUR) return copy.duration.minutes(Math.floor(total / MINUTE))
  if (total < DAY) {
    return copy.duration.hoursMinutes(Math.floor(total / HOUR), Math.floor((total % HOUR) / MINUTE))
  }
  return copy.duration.daysHours(Math.floor(total / DAY), Math.floor((total % DAY) / HOUR))
}

const dayNumber = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / DAY
}

const hhmm = (minuteOfDay: number): string =>
  `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`

/**
 * An instant relative to `now`'s local day: "hoy 14:00", "mañana 10:30", "ayer 09:00", otherwise
 * "dd/MM HH:mm" (24 h, Europe/Madrid).
 */
export function formatRelativeDay(iso: string, now: string): string {
  const at = zonedClock(iso, HOSPITAL_TIME_ZONE)
  const today = zonedClock(now, HOSPITAL_TIME_ZONE)
  const diff = dayNumber(at.date) - dayNumber(today.date)
  const time = hhmm(at.minuteOfDay)
  if (diff === 0) return `${copy.day.today} ${time}`
  if (diff === 1) return `${copy.day.tomorrow} ${time}`
  if (diff === -1) return `${copy.day.yesterday} ${time}`
  const [, month, day] = at.date.split('-')
  return `${day}/${month} ${time}`
}
