import type { Alert } from '@/domain/schemas'
import { es } from '@/i18n/es'

/** The Spanish text of an alert, built from its rule and params. */
export function alertText(alert: Alert): string {
  const rules = es.alerts.rules as Record<string, ((p: never) => string) | undefined>
  const build = rules[alert.ruleId]
  return build ? build((alert.params ?? {}) as never) : alert.message
}
