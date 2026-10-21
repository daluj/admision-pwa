import { describe, expect, it } from 'vitest'
import { addMinutes, formatDateTime, zonedDayAt } from './time'

const MADRID = 'Europe/Madrid'

describe('zonedDayAt', () => {
  it.each([
    // summer time (UTC+2)
    ['2026-10-20T15:00:00.000Z', '2026-10-20T06:00:00.000Z'],
    // winter time (UTC+1)
    ['2026-12-01T10:00:00.000Z', '2026-12-01T07:00:00.000Z'],
    // just after midnight in Madrid, still the previous day in UTC
    ['2026-10-19T22:30:00.000Z', '2026-10-20T06:00:00.000Z'],
    // just before midnight in Madrid
    ['2026-12-01T22:59:00.000Z', '2026-12-01T07:00:00.000Z'],
    // DST starts 2026-03-29 (02:00 → 03:00): 08:00 is UTC+2
    ['2026-03-29T12:00:00.000Z', '2026-03-29T06:00:00.000Z'],
    // day before DST starts: UTC+1
    ['2026-03-28T12:00:00.000Z', '2026-03-28T07:00:00.000Z'],
    // DST ends 2026-10-25 (03:00 → 02:00): 08:00 is UTC+1
    ['2026-10-25T12:00:00.000Z', '2026-10-25T07:00:00.000Z'],
    // day before DST ends: UTC+2
    ['2026-10-24T12:00:00.000Z', '2026-10-24T06:00:00.000Z'],
  ])('08:00 Madrid on the day of %s is %s', (iso, expected) => {
    expect(zonedDayAt(iso, MADRID, 8)).toBe(expected)
  })

  it('supports minutes and other time zones', () => {
    expect(zonedDayAt('2026-10-20T15:00:00Z', MADRID, 13, 30)).toBe('2026-10-20T11:30:00.000Z')
    expect(zonedDayAt('2026-10-20T15:00:00Z', 'UTC', 8)).toBe('2026-10-20T08:00:00.000Z')
  })
})

describe('formatDateTime', () => {
  it('formats dd/MM/yyyy HH:mm in Madrid time, 24 h', () => {
    expect(formatDateTime('2026-10-20T06:00:00.000Z')).toBe('20/10/2026 08:00')
    expect(formatDateTime('2026-12-01T21:05:00.000Z')).toBe('01/12/2026 22:05')
  })
})

describe('addMinutes', () => {
  it('adds and subtracts minutes', () => {
    expect(addMinutes('2026-10-20T06:00:00.000Z', 90)).toBe('2026-10-20T07:30:00.000Z')
    expect(addMinutes('2026-10-20T06:00:00.000Z', -60 * 24)).toBe('2026-10-19T06:00:00.000Z')
  })
})
