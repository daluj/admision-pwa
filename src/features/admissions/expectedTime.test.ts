import { describe, expect, it } from 'vitest'
import { dayOffsetOf, localTimeOf, nextFullHour, toInstant } from './expectedTime'

const NOW = '2026-10-21T10:00:00.000Z' // 12:00 in Madrid (UTC+2)

describe('expected discharge time helpers', () => {
  it('converts local HH:mm on an offered day to a UTC instant', () => {
    expect(toInstant(NOW, 0, '14:30')).toBe('2026-10-21T12:30:00.000Z')
    expect(toInstant(NOW, 1, '09:00')).toBe('2026-10-22T07:00:00.000Z')
    expect(toInstant(NOW, 2, '00:00')).toBe('2026-10-22T22:00:00.000Z')
  })

  it('rejects malformed times', () => {
    for (const bad of ['', '9:00', '24:00', '12:60', 'ab:cd', '12-00'])
      expect(toInstant(NOW, 0, bad)).toBeNull()
  })

  it('reads an instant back as a local day offset and time', () => {
    expect(dayOffsetOf('2026-10-21T12:30:00.000Z', NOW)).toBe(0)
    expect(dayOffsetOf('2026-10-22T07:00:00.000Z', NOW)).toBe(1)
    expect(dayOffsetOf('2026-10-23T07:00:00.000Z', NOW)).toBe(2)
    expect(dayOffsetOf('2026-10-25T07:00:00.000Z', NOW)).toBeNull()
    expect(dayOffsetOf('2026-10-20T07:00:00.000Z', NOW)).toBeNull()
    expect(localTimeOf('2026-10-21T12:30:00.000Z')).toBe('14:30')
  })

  it('uses the Madrid day, not the UTC day', () => {
    // 22:30Z on the 21st is 00:30 on the 22nd in Madrid → tomorrow.
    expect(dayOffsetOf('2026-10-21T22:30:00.000Z', NOW)).toBe(1)
    expect(dayOffsetOf('2026-10-21T21:30:00.000Z', NOW)).toBe(0)
  })

  it('survives the 25-hour day when summer time ends (2026-10-25)', () => {
    const now = '2026-10-24T10:00:00.000Z' // Saturday 12:00, the day before the change
    expect(toInstant(now, 1, '12:00')).toBe('2026-10-25T11:00:00.000Z') // UTC+1 on the 25th
    expect(toInstant(now, 2, '00:00')).toBe('2026-10-25T23:00:00.000Z')
    expect(dayOffsetOf('2026-10-25T11:00:00.000Z', now)).toBe(1)
  })

  it('suggests the next full hour, rolling over to tomorrow late at night', () => {
    expect(nextFullHour(NOW)).toEqual({ offset: 0, time: '13:00' })
    expect(nextFullHour('2026-10-21T21:10:00.000Z')).toEqual({ offset: 1, time: '08:00' }) // 23:10 Madrid
  })
})
