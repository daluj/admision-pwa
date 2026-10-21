import { canAcknowledgeAlert } from '@/domain/access'
import { alertCandidates, diffAlerts, visibleAlerts, type AlertConfig } from '@/domain/alerts'
import type { Id } from '@/domain/schemas'
import { executeCommand, type ExecuteDeps } from './execute'
import { buildEvent, InvalidCommandError, putChange, requireEntity, type Command } from './types'

/** The actor may not acknowledge this alert (their role, or it is outside their unit). */
export class AlertForbiddenError extends InvalidCommandError {
  constructor(message: string) {
    super(message)
    this.name = 'AlertForbiddenError'
  }
}

/** Nothing to raise or resolve: the evaluation is a no-op and writes nothing. */
export class NoAlertChangesError extends InvalidCommandError {
  constructor() {
    super('No alert changes')
    this.name = 'NoAlertChangesError'
  }
}

/**
 * The alert engine: compares what is wrong now (`alertCandidates`) with the open alerts and writes
 * the difference in one transaction — `AlertResolved` for what is over, `AlertRaised` for what is
 * new (an escalation is a resolve + raise). Rejects with `NoAlertChangesError` when nothing changed.
 */
export const evaluateAlerts: Command<{ config: AlertConfig }> = async (ctx, { config }) => {
  const r = ctx.repositories
  const [
    alerts,
    edVisits,
    admissions,
    bedRequests,
    beds,
    units,
    patients,
    specialties,
    transfers,
    porters,
  ] = await Promise.all([
    r.alert.list(),
    r.edVisit.list(),
    r.admission.list(),
    r.bedRequest.list(),
    r.bed.list(),
    r.unit.list(),
    r.patient.list(),
    r.specialty.list(),
    r.transferRequest.list(),
    r.porter.list(),
  ])
  const candidates = alertCandidates(
    {
      edVisits,
      admissions,
      bedRequests,
      beds,
      units,
      patients,
      specialties,
      transfers,
      porters,
      now: ctx.now,
    },
    config,
  )
  const { raise, resolve } = diffAlerts(alerts, candidates, { now: ctx.now, newId: ctx.newId })
  if (raise.length === 0 && resolve.length === 0) throw new NoAlertChangesError()

  return {
    events: [
      ...resolve.map((alert) => buildEvent(ctx, 'AlertResolved', alert.id, {})),
      ...raise.map((alert) =>
        buildEvent(ctx, 'AlertRaised', alert.id, {
          ruleId: alert.ruleId,
          severity: alert.severity,
          entityType: alert.entityType,
          entityId: alert.entityId,
          message: alert.message,
          ...(alert.params ? { params: alert.params } : {}),
        }),
      ),
    ],
    changes: [
      ...resolve.map((alert) => putChange(ctx, 'alert', { ...alert, resolvedAt: ctx.now })),
      ...raise.map((alert) => putChange(ctx, 'alert', alert)),
    ],
  }
}

/** Runs the evaluation; resolves to the counts, `{ raised: 0, resolved: 0 }` when nothing changed. */
export async function runAlertEvaluation(
  deps: ExecuteDeps,
  config: AlertConfig,
): Promise<{ raised: number; resolved: number }> {
  try {
    const events = await executeCommand(deps, evaluateAlerts, { config })
    return {
      raised: events.filter((e) => e.type === 'AlertRaised').length,
      resolved: events.filter((e) => e.type === 'AlertResolved').length,
    }
  } catch (error) {
    if (error instanceof NoAlertChangesError) return { raised: 0, resolved: 0 }
    throw error
  }
}

/** A person takes note of an open alert. Emits `AlertAcknowledged`; the actor must be a user. */
export const acknowledgeAlert: Command<{ alertId: Id }> = async (ctx, { alertId }) => {
  if (ctx.actor === 'simulator')
    throw new InvalidCommandError('Only a user can acknowledge an alert')
  const [alert, user] = await Promise.all([
    requireEntity(ctx, 'alert', alertId),
    ctx.repositories.user.get(ctx.actor),
  ])
  // Permission is a domain rule, not only a button: role first, then the alert's own scope.
  if (!user || !canAcknowledgeAlert(user.role)) {
    throw new AlertForbiddenError(`User ${ctx.actor} may not acknowledge alerts`)
  }
  if (visibleAlerts([alert], user).length === 0) {
    throw new AlertForbiddenError(`Alert ${alertId} is not visible to ${ctx.actor}`)
  }
  if (alert.resolvedAt) throw new InvalidCommandError(`Alert ${alertId} is already resolved`)
  if (alert.acknowledgedAt)
    throw new InvalidCommandError(`Alert ${alertId} is already acknowledged`)
  return {
    events: [buildEvent(ctx, 'AlertAcknowledged', alert.id, { acknowledgedBy: ctx.actor })],
    changes: [
      putChange(ctx, 'alert', { ...alert, acknowledgedAt: ctx.now, acknowledgedBy: ctx.actor }),
    ],
  }
}
