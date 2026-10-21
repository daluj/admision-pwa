/**
 * Time-zone helpers on top of Intl (no dependency). Pure: they never read the current time.
 */

export const HOSPITAL_TIME_ZONE = 'Europe/Madrid'

const MINUTE = 60_000

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    partsFormatters.set(timeZone, formatter)
  }
  return formatter
}

type WallTime = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function wallTime(epochMs: number, timeZone: string): WallTime {
  const parts = Object.fromEntries(
    partsFormatter(timeZone)
      .formatToParts(epochMs)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>
  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
    hour: parts.hour!,
    minute: parts.minute!,
    second: parts.second!,
  }
}

/** Offset of `timeZone` from UTC at `epochMs`, in ms (e.g. +2 h for Madrid in summer). */
function offsetAt(epochMs: number, timeZone: string): number {
  const w = wallTime(epochMs, timeZone)
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second)
  return asUtc - Math.floor(epochMs / 1000) * 1000
}

/**
 * The UTC instant of `hour:minute` wall-clock time in `timeZone`, on the local calendar day that
 * contains `iso`. Example: `zonedDayAt('2026-10-20T15:00:00Z', 'Europe/Madrid', 8)` →
 * `'2026-10-20T06:00:00.000Z'`. DST-safe for times that exist on that day.
 */
export function zonedDayAt(iso: string, timeZone: string, hour: number, minute = 0): string {
  const { year, month, day } = wallTime(Date.parse(iso), timeZone)
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  let result = guess - offsetAt(guess, timeZone)
  // Re-check with the offset at the result (handles a DST change between guess and result).
  result = guess - offsetAt(result, timeZone)
  return new Date(result).toISOString()
}

/** Adds minutes to an ISO instant. */
export function addMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * MINUTE).toISOString()
}

const displayFormatters = new Map<string, Intl.DateTimeFormat>()

/** `dd/MM/yyyy HH:mm` (24 h) in `timeZone`, for UI display. */
export function formatDateTime(iso: string, timeZone: string = HOSPITAL_TIME_ZONE): string {
  let formatter = displayFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('es-ES', {
      timeZone,
      hourCycle: 'h23',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    displayFormatters.set(timeZone, formatter)
  }
  return formatter.format(Date.parse(iso)).replace(',', '')
}
