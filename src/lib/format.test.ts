import { describe, expect, it } from 'vitest'
import { formatDuration, formatRelativeDay } from './format'

const MIN = 60_000
const H = 60 * MIN

describe('formatDuration', () => {
  it.each([
    [-5, '<1 min'],
    [0, '<1 min'],
    [59_999, '<1 min'],
    [MIN, '1 min'],
    [35 * MIN, '35 min'],
    [H, '1 h'],
    [2 * H + 15 * MIN, '2 h 15 min'],
    [23 * H + 59 * MIN, '23 h 59 min'],
    [24 * H, '1 d'],
    [3 * 24 * H + 4 * H + 30 * MIN, '3 d 4 h'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected)
  })
})

describe('formatRelativeDay', () => {
  const NOW = '2026-10-21T10:00:00.000Z' // 12:00 in Madrid
  it.each([
    ['2026-10-21T12:00:00.000Z', 'hoy 14:00'],
    ['2026-10-20T22:30:00.000Z', 'hoy 00:30'],
    ['2026-10-21T21:59:00.000Z', 'hoy 23:59'],
    ['2026-10-21T22:00:00.000Z', 'mañana 00:00'],
    ['2026-10-22T08:30:00.000Z', 'mañana 10:30'],
    ['2026-10-20T07:00:00.000Z', 'ayer 09:00'],
    ['2026-10-25T07:00:00.000Z', '25/10 08:00'],
    ['2026-10-19T07:00:00.000Z', '19/10 09:00'],
  ])('%s → %s', (iso, expected) => {
    expect(formatRelativeDay(iso, NOW)).toBe(expected)
  })

  it('counts calendar days across the end of summer time', () => {
    // 2026-10-25 has 25 hours: 23:30 Madrid is still "hoy" at 00:30 the same day.
    expect(formatRelativeDay('2026-10-25T22:30:00.000Z', '2026-10-24T22:30:00.000Z')).toBe(
      'hoy 23:30',
    )
    expect(formatRelativeDay('2026-10-25T23:30:00.000Z', '2026-10-25T00:30:00.000Z')).toBe(
      'mañana 00:30',
    )
  })
})
