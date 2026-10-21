import type { Alert, Id, IsoDateTime } from '@/domain/schemas'
import type { AlertCandidate } from './rules'

export const alertKey = (alert: Pick<Alert, 'ruleId' | 'entityId'>): string =>
  `${alert.ruleId}:${alert.entityId}`

export type AlertDiff = {
  /** New alerts to raise (including the replacement of an escalated one). */
  raise: Alert[]
  /** Open alerts that are over, or are being replaced because their severity changed. */
  resolve: Alert[]
}

/**
 * Compares the open alerts with what is wrong now: new problems are raised, solved ones resolved,
 * and a severity change resolves the old alert and raises a new one (nothing is edited silently,
 * every change is an event). An unchanged problem keeps its alert, acknowledged or not.
 */
export function diffAlerts(
  open: readonly Alert[],
  candidates: readonly AlertCandidate[],
  ctx: { now: IsoDateTime; newId: () => Id },
): AlertDiff {
  const openByKey = new Map<string, Alert>()
  for (const alert of open) if (!alert.resolvedAt) openByKey.set(alertKey(alert), alert)

  const raise: Alert[] = []
  const resolve: Alert[] = []
  const seen = new Set<string>()

  for (const c of candidates) {
    if (seen.has(c.key)) continue // two sources for the same problem: one alert
    seen.add(c.key)
    const existing = openByKey.get(c.key)
    if (existing && existing.severity === c.severity) continue
    if (existing) resolve.push(existing)
    raise.push({
      id: ctx.newId(),
      createdAt: ctx.now,
      updatedAt: ctx.now,
      ruleId: c.ruleId,
      severity: c.severity,
      entityType: c.entityType,
      entityId: c.entityId,
      message: c.message,
      params: c.params,
      raisedAt: ctx.now,
    })
  }
  for (const [key, alert] of openByKey) if (!seen.has(key)) resolve.push(alert)
  return { raise, resolve }
}
