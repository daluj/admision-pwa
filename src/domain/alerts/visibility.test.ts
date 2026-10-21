import { describe, expect, it } from 'vitest'
import { ROLES, type Alert } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { sortAlerts, summarizeAlerts, visibleAlerts } from './visibility'

const alert = (id: string, extra: Partial<Alert>): Alert => ({
  ...sampleEntities.alert,
  id,
  ruleId: 'BOARDING_LONG',
  severity: 'WARNING',
  raisedAt: '2026-10-21T08:00:00.000Z',
  ...extra,
})
const ED = alert('ed', {})
const CLEAN = alert('clean', { ruleId: 'BED_PENDING_CLEANING_LONG', params: { unitId: 'u1' } })
const CLEAN_U2 = alert('clean2', { ruleId: 'BED_PENDING_CLEANING_LONG', params: { unitId: 'u2' } })
const SLA = alert('sla', { ruleId: 'TRANSFER_SLA_BREACH' })
const BALANCE = alert('bal', { ruleId: 'BED_BALANCE_NEGATIVE' })
const ALL = [ED, CLEAN, CLEAN_U2, SLA, BALANCE]
const ids = (list: Alert[]) => list.map((a) => a.id).sort()

describe('visibleAlerts', () => {
  it('head and management see everything', () => {
    expect(ids(visibleAlerts(ALL, { role: 'ADMISSIONS_HEAD' }))).toEqual(ids(ALL))
    expect(ids(visibleAlerts(ALL, { role: 'MANAGEMENT' }))).toEqual(ids(ALL))
  })
  it('other roles only see the areas they can open', () => {
    expect(ids(visibleAlerts(ALL, { role: 'ED_COORDINATOR' }))).toEqual(['clean', 'clean2', 'ed'])
    expect(ids(visibleAlerts(ALL, { role: 'BED_MANAGER' }))).toEqual([
      'bal',
      'clean',
      'clean2',
      'sla',
    ])
    expect(ids(visibleAlerts(ALL, { role: 'PORTER' }))).toEqual(['sla'])
  })
  it('a nurse supervisor only sees alerts of their own unit and fails closed without one', () => {
    expect(ids(visibleAlerts(ALL, { role: 'NURSE_SUPERVISOR', unitId: 'u1' }))).toEqual(['clean'])
    expect(visibleAlerts(ALL, { role: 'NURSE_SUPERVISOR', unitId: undefined })).toEqual([])
    expect(visibleAlerts(ALL, { role: 'NURSE_SUPERVISOR', unitId: null })).toEqual([])
  })
  it('hides alerts of unknown rules', () => {
    for (const role of ROLES) {
      expect(visibleAlerts([alert('x', { ruleId: 'MADE_UP' })], { role })).toEqual([])
    }
  })
})

describe('sortAlerts / summarizeAlerts', () => {
  it('critical first, then the oldest', () => {
    const list = [
      alert('a', { severity: 'WARNING', raisedAt: '2026-10-21T07:00:00.000Z' }),
      alert('b', { severity: 'CRITICAL', raisedAt: '2026-10-21T09:00:00.000Z' }),
      alert('c', { severity: 'CRITICAL', raisedAt: '2026-10-21T06:00:00.000Z' }),
      alert('d', { severity: 'WARNING', raisedAt: '2026-10-21T06:00:00.000Z' }),
    ]
    expect(sortAlerts(list).map((a) => a.id)).toEqual(['c', 'b', 'd', 'a'])
  })

  it('counts unacknowledged open alerts and their worst severity; keeps recent resolved', () => {
    const list = [
      alert('w', { severity: 'WARNING' }),
      alert('c-ack', {
        severity: 'CRITICAL',
        acknowledgedAt: '2026-10-21T09:00:00.000Z',
        acknowledgedBy: 'u',
      }),
      alert('old', { resolvedAt: '2026-10-21T09:00:00.000Z' }),
      alert('older', { resolvedAt: '2026-10-21T08:30:00.000Z' }),
    ]
    const summary = summarizeAlerts(list, 1)
    expect(summary.open.map((a) => a.id)).toEqual(['c-ack', 'w'])
    expect(summary.unacknowledged).toBe(1)
    expect(summary.worst).toBe('WARNING') // the critical one is acknowledged
    expect(summary.resolved.map((a) => a.id)).toEqual(['old'])
    expect(summarizeAlerts([])).toEqual({ open: [], unacknowledged: 0, worst: null, resolved: [] })
  })
})
