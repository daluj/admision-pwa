import { z } from 'zod'
import { EntityBase, Id, IsoDateTime } from './common'

export const ALERT_SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'] as const
export const AlertSeverity = z.enum(ALERT_SEVERITIES)
export type AlertSeverity = z.infer<typeof AlertSeverity>

export const Alert = EntityBase.extend({
  ruleId: z.string().min(1),
  severity: AlertSeverity,
  entityType: z.string().min(1),
  entityId: Id,
  message: z.string().min(1),
  raisedAt: IsoDateTime,
  acknowledgedAt: IsoDateTime.optional(),
  acknowledgedBy: Id.optional(),
  resolvedAt: IsoDateTime.optional(),
})
export type Alert = z.infer<typeof Alert>
