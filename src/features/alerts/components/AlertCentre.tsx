import { OctagonAlert, TriangleAlert, Info } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { NAV_ITEMS } from '@/components/layout/nav'
import { useSimNow, useUsers } from '@/data/hooks'
import { ALERT_AREAS, alertArea, type AlertArea, type AlertSummary } from '@/domain/alerts'
import type { Alert, AlertSeverity } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { formatDuration, formatRelativeDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAlertActions } from '../useAlertActions'

const copy = es.alerts.centre
const SEVERITY_ICON = { CRITICAL: OctagonAlert, WARNING: TriangleAlert, INFO: Info } as const
const SEVERITY_STYLE: Record<AlertSeverity, string> = {
  CRITICAL: 'text-status-critical',
  WARNING: 'text-status-warn',
  INFO: 'text-status-info',
}
const SEVERITIES: readonly AlertSeverity[] = ['CRITICAL', 'WARNING']

/** The Spanish text of an alert, built from its rule and params. */
export function alertText(alert: Alert): string {
  const rules = es.alerts.rules as Record<string, ((p: never) => string) | undefined>
  const build = rules[alert.ruleId]
  return build ? build((alert.params ?? {}) as never) : alert.message
}

const pathOf = (area: AlertArea) => NAV_ITEMS.find((item) => item.id === area)?.path ?? '/'

type AlertCentreProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: AlertSummary
}

/** Side sheet with the alerts the user may see: filters, acknowledge, link to the area, recently resolved. */
export function AlertCentre({ open, onOpenChange, summary }: AlertCentreProps) {
  const [severity, setSeverity] = useState<AlertSeverity | ''>('')
  const [area, setArea] = useState<AlertArea | ''>('')
  const [error, setError] = useState<string | null>(null)
  const actions = useAlertActions()
  const now = useSimNow()
  const users = useUsers()

  const nameOf = (id: string | undefined) => users?.find((u) => u.id === id)?.displayName
  const shown = summary.open.filter(
    (a) => (!severity || a.severity === severity) && (!area || alertArea(a) === area),
  )

  const acknowledge = async (alert: Alert) => {
    setError(null)
    const result = await actions.acknowledge(alert.id)
    if (!result.ok) setError(result.message)
  }

  const field = 'border-input bg-background h-8 rounded-md border px-2 text-sm'
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>{copy.description}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6 text-sm">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1" htmlFor="alert-filter-severity">
              <span className="text-muted-foreground text-xs">{copy.severity}</span>
              <select
                id="alert-filter-severity"
                className={field}
                value={severity}
                onChange={(event) => setSeverity(event.target.value as AlertSeverity | '')}
              >
                <option value="">{copy.all}</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {copy.severities[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1" htmlFor="alert-filter-area">
              <span className="text-muted-foreground text-xs">{copy.area}</span>
              <select
                id="alert-filter-area"
                className={field}
                value={area}
                onChange={(event) => setArea(event.target.value as AlertArea | '')}
              >
                <option value="">{copy.all}</option>
                {ALERT_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {copy.areas[a]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <p role="alert" className="text-status-critical font-medium">
              {error}
            </p>
          )}

          <section aria-labelledby="alerts-open">
            <h3 id="alerts-open" className="mb-2 font-semibold">
              {copy.open} ({shown.length})
            </h3>
            {shown.length === 0 ? (
              <p className="text-muted-foreground">
                {summary.open.length === 0 ? copy.emptyOpen : copy.emptyFiltered}
              </p>
            ) : (
              <ul aria-label={copy.open} className="divide-y">
                {shown.map((alert) => {
                  const Icon = SEVERITY_ICON[alert.severity]
                  const rowArea = alertArea(alert)
                  const text = alertText(alert)
                  const acknowledger = nameOf(alert.acknowledgedBy)
                  return (
                    <li
                      key={alert.id}
                      data-alert={alert.id}
                      data-severity={alert.severity}
                      data-acknowledged={alert.acknowledgedAt ? 'true' : undefined}
                      className="flex flex-col gap-1 py-3"
                    >
                      <p
                        className={cn(
                          'flex items-start gap-2 font-medium',
                          SEVERITY_STYLE[alert.severity],
                        )}
                      >
                        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>
                          <span className="sr-only">{copy.severities[alert.severity]}: </span>
                          <span className="text-foreground">{text}</span>
                        </span>
                      </p>
                      <p className="text-muted-foreground pl-6 text-xs">
                        {copy.severities[alert.severity]}
                        {rowArea && ` · ${copy.areas[rowArea]}`}
                        {now &&
                          ` · ${copy.since(formatDuration(Date.parse(now) - Date.parse(alert.raisedAt)))}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pl-6">
                        {alert.acknowledgedAt ? (
                          <span className="text-muted-foreground text-xs">
                            {now
                              ? acknowledger
                                ? copy.acknowledged(
                                    acknowledger,
                                    formatRelativeDay(alert.acknowledgedAt, now),
                                  )
                                : copy.acknowledgedAnon(
                                    formatRelativeDay(alert.acknowledgedAt, now),
                                  )
                              : ''}
                          </span>
                        ) : (
                          actions.canAcknowledge && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actions.busy}
                              onClick={() => void acknowledge(alert)}
                              aria-label={copy.acknowledgeFor(text)}
                            >
                              {copy.acknowledge}
                            </Button>
                          )
                        )}
                        {rowArea && (
                          <Link
                            to={pathOf(rowArea)}
                            onClick={() => onOpenChange(false)}
                            className="text-xs underline-offset-2 hover:underline"
                          >
                            {copy.goTo(copy.areas[rowArea])}
                          </Link>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="alerts-resolved">
            <h3 id="alerts-resolved" className="mb-2 font-semibold">
              {copy.resolved}
            </h3>
            {summary.resolved.length === 0 ? (
              <p className="text-muted-foreground">{copy.emptyResolved}</p>
            ) : (
              <ul aria-label={copy.resolved} className="divide-y">
                {summary.resolved.map((alert) => (
                  <li key={alert.id} data-alert={alert.id} className="text-muted-foreground py-2">
                    <p>{alertText(alert)}</p>
                    {alert.resolvedAt && now && (
                      <p className="text-xs">
                        {copy.resolvedAt(formatRelativeDay(alert.resolvedAt, now))}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
