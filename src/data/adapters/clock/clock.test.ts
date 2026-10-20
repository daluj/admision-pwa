import { describe, expect, it } from 'vitest'
import { IsoDateTime } from '@/domain/schemas'
import { createFixedClock } from './fixedClock'
import { systemClock } from './systemClock'

describe('clocks', () => {
  it('systemClock returns an ISO UTC string', () => {
    expect(IsoDateTime.safeParse(systemClock.now()).success).toBe(true)
  })

  it('fixedClock can be set and advanced', () => {
    const clock = createFixedClock('2026-10-20T08:00:00.000Z')
    expect(clock.now()).toBe('2026-10-20T08:00:00.000Z')
    clock.advance(90 * 60 * 1000)
    expect(clock.now()).toBe('2026-10-20T09:30:00.000Z')
    clock.set('2026-10-21T00:00:00.000Z')
    expect(clock.now()).toBe('2026-10-21T00:00:00.000Z')
  })
})
