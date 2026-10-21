import { describe, expect, it } from 'vitest'
import type { Alert } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { diffAlerts } from './diff'
import type { AlertCandidate } from './rules'

const NOW = '2026-10-21T10:00:00.000Z'
let n = 0
const ctx = { now: NOW, newId: () => `new-${++n}` }

const cand = (
  entityId: string,
  severity: AlertCandidate['severity'] = 'WARNING',
): AlertCandidate => ({
  key: `BOARDING_LONG:${entityId}`,
  ruleId: 'BOARDING_LONG',
  severity,
  entityType: 'EdVisit',
  entityId,
  message: 'x',
  params: { initials: 'M. G.' },
})
const open = (entityId: string, extra: Partial<Alert> = {}): Alert => ({
  ...sampleEntities.alert,
  id: `alr-${entityId}`,
  ruleId: 'BOARDING_LONG',
  severity: 'WARNING',
  entityId,
  ...extra,
})

describe('diffAlerts', () => {
  it('raises new problems with the time, message and params', () => {
    const { raise, resolve } = diffAlerts([], [cand('v1')], ctx)
    expect(resolve).toEqual([])
    expect(raise).toHaveLength(1)
    expect(raise[0]).toMatchObject({
      ruleId: 'BOARDING_LONG',
      severity: 'WARNING',
      entityType: 'EdVisit',
      entityId: 'v1',
      raisedAt: NOW,
      params: { initials: 'M. G.' },
    })
    expect(raise[0]!.acknowledgedAt).toBeUndefined()
  })

  it('leaves an unchanged problem alone, acknowledged or not', () => {
    const acknowledged = open('v1', { acknowledgedAt: NOW, acknowledgedBy: 'usr-1' })
    expect(diffAlerts([acknowledged], [cand('v1')], ctx)).toEqual({ raise: [], resolve: [] })
  })

  it('resolves what is no longer a problem', () => {
    const { raise, resolve } = diffAlerts([open('v1'), open('v2')], [cand('v2')], ctx)
    expect(raise).toEqual([])
    expect(resolve.map((a) => a.entityId)).toEqual(['v1'])
  })

  it('an escalation resolves the old alert and raises a new one', () => {
    const { raise, resolve } = diffAlerts([open('v1')], [cand('v1', 'CRITICAL')], ctx)
    expect(resolve.map((a) => a.id)).toEqual(['alr-v1'])
    expect(raise).toHaveLength(1)
    expect(raise[0]).toMatchObject({ entityId: 'v1', severity: 'CRITICAL' })
  })

  it('a de-escalation also replaces the alert', () => {
    const { raise, resolve } = diffAlerts(
      [open('v1', { severity: 'CRITICAL' })],
      [cand('v1', 'WARNING')],
      ctx,
    )
    expect(resolve).toHaveLength(1)
    expect(raise[0]!.severity).toBe('WARNING')
  })

  it('ignores resolved alerts: the same problem later is a new alert', () => {
    const resolved = open('v1', { resolvedAt: '2026-10-21T09:00:00.000Z' })
    const { raise, resolve } = diffAlerts([resolved], [cand('v1')], ctx)
    expect(resolve).toEqual([])
    expect(raise).toHaveLength(1)
  })

  it('never raises the same key twice', () => {
    const { raise } = diffAlerts([], [cand('v1'), cand('v1')], ctx)
    expect(raise).toHaveLength(1)
  })

  it('a de-escalation keeps the acknowledgement; an escalation starts unacknowledged', () => {
    const ack = { acknowledgedAt: NOW, acknowledgedBy: 'usr-1' }
    const down = diffAlerts(
      [open('v1', { severity: 'CRITICAL', ...ack })],
      [cand('v1', 'WARNING')],
      ctx,
    )
    expect(down.raise[0]).toMatchObject(ack)
    const up = diffAlerts(
      [open('v1', { severity: 'WARNING', ...ack })],
      [cand('v1', 'CRITICAL')],
      ctx,
    )
    expect(up.raise[0]!.acknowledgedAt).toBeUndefined()
  })
})
