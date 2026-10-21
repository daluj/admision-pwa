import { HOSPITAL_TIME_ZONE, zonedClock } from '@/lib/time'

export type LocalTime = { date: string; minuteOfDay: number; hour: number }

export function localTime(iso: string): LocalTime {
  const { date, minuteOfDay } = zonedClock(iso, HOSPITAL_TIME_ZONE)
  return { date, minuteOfDay, hour: Math.floor(minuteOfDay / 60) }
}

export const inHours = (local: LocalTime, [from, to]: readonly [number, number]): boolean =>
  local.hour >= from && local.hour <= to
