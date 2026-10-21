import { describe, expect, it } from 'vitest'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { ALERT_NOW, alertInput } from '@/test/alertsFixture'
import { DEFAULT_ALERT_CONFIG } from './config'
import { computeOverview, hourlyFlow } from './overview'

const HOUR = 3_600_000
const at = (hoursAgo: number, minute = 0) => {
  const base = Math.floor(Date.parse(ALERT_NOW) / HOUR) * HOUR
  return new Date(base - hoursAgo * HOUR + minute * 60_000).toISOString()
}

describe('hourlyFlow', () => {
  const adm = (extra: object) => ({
    ...sampleEntities.admission,
    admittedAt: undefined,
    dischargedAt: undefined,
    ...extra,
  })

  it('has 24 hourly buckets, oldest first, the current one marked partial', () => {
    const buckets = hourlyFlow([], ALERT_NOW)
    expect(buckets).toHaveLength(24)
    expect(buckets[23]).toMatchObject({ start: at(0), partial: true })
    expect(buckets[0]).toMatchObject({ start: at(23), partial: false })
  })

  it('counts admissions and discharges in the hour they happened', () => {
    const buckets = hourlyFlow(
      [
        adm({ admittedAt: at(0, 10) }),
        adm({ admittedAt: at(0, 50), dischargedAt: at(3, 5) }),
        adm({ dischargedAt: at(23, 59) }),
      ],
      ALERT_NOW,
    )
    expect(buckets[23]).toMatchObject({ admitted: 2, discharged: 0 })
    expect(buckets[20]).toMatchObject({ admitted: 0, discharged: 1 })
    expect(buckets[0]).toMatchObject({ discharged: 1 })
  })

  it('ignores anything older than 24 h or in the future', () => {
    const buckets = hourlyFlow(
      [adm({ admittedAt: at(24, 59) }), adm({ dischargedAt: at(-1) })],
      ALERT_NOW,
    )
    expect(buckets.reduce((n, b) => n + b.admitted + b.discharged, 0)).toBe(0)
  })
})

describe('computeOverview', () => {
  const overview = computeOverview(alertInput, DEFAULT_ALERT_CONFIG)

  it('puts every area in one object', () => {
    expect(overview.ed.boarding).toBe(3)
    expect(overview.transfers.open).toBe(4)
    expect(overview.census.counts.total).toBe(alertInput.beds.length)
    expect(overview.edHourly).toHaveLength(24)
    expect(overview.flow).toHaveLength(24)
  })

  it('derives the hospital status and the tile colours from the configured thresholds', () => {
    // The longest boarder waited 9 h: over the 6 h alert limit, under the 12 h critical one.
    expect(overview.status.level).toBe('ALERT')
    expect(overview.status.reasons.map((r) => r.kind)).toContain('boardingLong')
    const strict = computeOverview(alertInput, {
      ...DEFAULT_ALERT_CONFIG,
      boardingCountAlert: 1,
      boardingCountCritical: 2,
    })
    expect(strict.tiles.boarding).toBe('critical')
    expect(computeOverview(alertInput, DEFAULT_ALERT_CONFIG).tiles.boarding).toBe('ok')
  })
})
