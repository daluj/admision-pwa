import { describe, expect, it } from 'vitest'
import { DEFAULT_ALERT_CONFIG } from './config'
import { computeStatusLevel } from './status'

const HOUR = 3_600_000
const run = (
  occupancy: number,
  boarding: number,
  longestHours: number | null,
  config = DEFAULT_ALERT_CONFIG,
) =>
  computeStatusLevel(
    { hospital: { occupancy } } as never,
    {
      kpis: { boarding, longestBoardingMs: longestHours === null ? null : longestHours * HOUR },
    } as never,
    config,
  )

describe('computeStatusLevel', () => {
  it('is normal when nothing is triggered', () => {
    expect(run(0.85, 5, 2)).toEqual({ level: 'NORMAL', reasons: [] })
    expect(run(0.85, 0, null).level).toBe('NORMAL')
  })

  it('occupancy: ≥ 92 % alert, ≥ 97 % critical (inclusive)', () => {
    expect(run(0.9199, 0, null).level).toBe('NORMAL')
    expect(run(0.92, 0, null).level).toBe('ALERT')
    expect(run(0.9699, 0, null).level).toBe('ALERT')
    expect(run(0.97, 0, null).level).toBe('CRITICAL')
  })

  it('boarding count: > 10 alert, > 20 critical (strict)', () => {
    expect(run(0.5, 10, null).level).toBe('NORMAL')
    expect(run(0.5, 11, null).level).toBe('ALERT')
    expect(run(0.5, 20, null).level).toBe('ALERT')
    expect(run(0.5, 21, null).level).toBe('CRITICAL')
  })

  it('longest boarding: > 6 h alert, > 12 h critical (strict)', () => {
    expect(run(0.5, 0, 6).level).toBe('NORMAL')
    expect(run(0.5, 0, 6.01).level).toBe('ALERT')
    expect(run(0.5, 0, 12).level).toBe('ALERT')
    expect(run(0.5, 0, 12.01).level).toBe('CRITICAL')
  })

  it('the highest level wins and every trigger is reported', () => {
    const status = run(0.93, 25, 7)
    expect(status.level).toBe('CRITICAL')
    expect(status.reasons.map((r) => `${r.kind}:${r.level}`)).toEqual([
      'occupancy:ALERT',
      'boardingCount:CRITICAL',
      'boardingLong:ALERT',
    ])
    expect(status.reasons[0]!.value).toBeCloseTo(0.93)
    expect(status.reasons[2]!.value).toBeCloseTo(7)
  })

  it('uses custom thresholds', () => {
    const config = { ...DEFAULT_ALERT_CONFIG, occupancyAlert: 0.8, occupancyCritical: 0.9 }
    expect(run(0.85, 0, null, config).level).toBe('ALERT')
    expect(run(0.9, 0, null, config).level).toBe('CRITICAL')
  })
})
