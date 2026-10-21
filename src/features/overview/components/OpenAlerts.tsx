import { OctagonAlert, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { NAV_ITEMS } from '@/components/layout/nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { alertArea } from '@/domain/alerts'
import type { Alert } from '@/domain/schemas'
import { alertText } from '@/features/alerts/alertText'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'

const copy = es.pages.overview.alertsCard
const severities = es.alerts.centre.severities
export const OVERVIEW_ALERT_LIMIT = 10

/** "Necesita atención": the most severe, oldest open alerts, each linking to its area. */
export function OpenAlerts({ alerts }: { alerts: readonly Alert[] }) {
  const shown = alerts.slice(0, OVERVIEW_ALERT_LIMIT)
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {shown.length === 0 ? (
          <p className="text-muted-foreground text-sm">{copy.empty}</p>
        ) : (
          <ul aria-label={copy.title} className="divide-y text-sm">
            {shown.map((alert) => {
              const critical = alert.severity === 'CRITICAL'
              const Icon = critical ? OctagonAlert : TriangleAlert
              const area = alertArea(alert)
              const path = NAV_ITEMS.find((item) => item.id === area)?.path
              const text = alertText(alert)
              return (
                <li
                  key={alert.id}
                  data-alert={alert.id}
                  data-severity={alert.severity}
                  className="flex items-start gap-2 py-2"
                >
                  <Icon
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      critical ? 'text-status-critical' : 'text-status-warn',
                    )}
                    aria-hidden="true"
                  />
                  <span className="sr-only">{severities[alert.severity]}: </span>
                  {path ? (
                    <Link to={path} className="hover:underline">
                      {text}
                    </Link>
                  ) : (
                    <span>{text}</span>
                  )}
                  {alert.acknowledgedAt && (
                    <span className="text-muted-foreground ml-auto text-xs">
                      {copy.acknowledged}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {alerts.length > shown.length && (
          <p className="text-muted-foreground mt-2 text-xs">
            {copy.more(alerts.length - shown.length)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
