import { canAccess } from '@/domain/access'
import type { Alert, AlertSeverity, Role } from '@/domain/schemas'
import { ALERT_RULE_AREA, type AlertArea, type AlertRuleId } from './rules'

export const alertArea = (alert: Pick<Alert, 'ruleId'>): AlertArea | undefined =>
  ALERT_RULE_AREA[alert.ruleId as AlertRuleId]

/**
 * The alerts a user may see: only those of areas their role can open; a nurse supervisor only
 * those of their own unit (alerts carry `params.unitId`), so hospital-level alerts and a missing
 * unit show nothing (fails closed). Alerts of unknown rules are hidden.
 */
export function visibleAlerts(
  alerts: readonly Alert[],
  user: { role: Role; unitId?: string | null | undefined },
): Alert[] {
  return alerts.filter((alert) => {
    const area = alertArea(alert)
    if (!area || !canAccess(user.role, area)) return false
    if (user.role === 'NURSE_SUPERVISOR') {
      return user.unitId != null && alert.params?.unitId === user.unitId
    }
    return true
  })
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 }

/** Most severe first, then the one raised longest ago. */
export function sortAlerts<T extends Pick<Alert, 'severity' | 'raisedAt' | 'id'>>(
  alerts: readonly T[],
): T[] {
  return [...alerts].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.raisedAt.localeCompare(b.raisedAt) ||
      a.id.localeCompare(b.id),
  )
}

export type AlertSummary = {
  /** Open (not resolved) alerts. */
  open: Alert[]
  /** Open and not yet acknowledged: what the bell counts. */
  unacknowledged: number
  /** Worst severity among the unacknowledged ones. */
  worst: AlertSeverity | null
  /** The most recently resolved ones, newest first. */
  resolved: Alert[]
}

export function summarizeAlerts(alerts: readonly Alert[], recentResolved = 10): AlertSummary {
  const open = sortAlerts(alerts.filter((a) => !a.resolvedAt))
  const pending = open.filter((a) => !a.acknowledgedAt)
  const worst = pending.reduce<AlertSeverity | null>(
    (top, a) => (top === null || SEVERITY_RANK[a.severity] < SEVERITY_RANK[top] ? a.severity : top),
    null,
  )
  const resolved = alerts
    .filter((a) => a.resolvedAt)
    .sort((a, b) => b.resolvedAt!.localeCompare(a.resolvedAt!) || a.id.localeCompare(b.id))
    .slice(0, recentResolved)
  return { open, unacknowledged: pending.length, worst, resolved }
}
