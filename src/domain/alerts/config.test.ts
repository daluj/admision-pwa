import { describe, expect, it } from 'vitest'
import { DEFAULT_ALERT_CONFIG, parseAlertConfig, validateAlertConfig } from './config'

describe('alert config', () => {
  it('defaults come from the spec and are valid', () => {
    expect(DEFAULT_ALERT_CONFIG).toMatchObject({
      occupancyAlert: 0.92,
      occupancyCritical: 0.97,
      boardingCountAlert: 10,
      boardingCountCritical: 20,
      boardingStatusAlertHours: 6,
      boardingStatusCriticalHours: 12,
      boardingLongWarnHours: 4,
      boardingLongCriticalHours: 8,
      pendingCleaningWarnMin: 60,
      pendingCleaningCriticalMin: 120,
      balanceCritical: -10,
    })
    expect(validateAlertConfig(DEFAULT_ALERT_CONFIG)).toEqual({})
  })

  it('flags out-of-range values and warn ≥ critical', () => {
    expect(
      validateAlertConfig({ ...DEFAULT_ALERT_CONFIG, wallRotationSec: 2, balanceCritical: 3 }),
    ).toEqual({ wallRotationSec: 'range', balanceCritical: 'range' })
    expect(
      validateAlertConfig({
        ...DEFAULT_ALERT_CONFIG,
        boardingLongWarnHours: 8,
        boardingLongCriticalHours: 8,
      }),
    ).toEqual({ boardingLongCriticalHours: 'order' })
    expect(
      validateAlertConfig({ ...DEFAULT_ALERT_CONFIG, occupancyAlert: Number.NaN }).occupancyAlert,
    ).toBe('range')
  })

  it('parses stored values defensively', () => {
    expect(parseAlertConfig(null)).toEqual(DEFAULT_ALERT_CONFIG)
    expect(parseAlertConfig('x')).toEqual(DEFAULT_ALERT_CONFIG)
    expect(parseAlertConfig({ wallRotationSec: 30, unknown: 1, balanceCritical: 'no' })).toEqual({
      ...DEFAULT_ALERT_CONFIG,
      wallRotationSec: 30,
    })
    // An invalid combination is discarded as a whole.
    expect(parseAlertConfig({ boardingLongWarnHours: 9 })).toEqual(DEFAULT_ALERT_CONFIG)
  })
})
