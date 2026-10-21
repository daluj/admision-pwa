import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { es } from '@/i18n/es'
import { SEVERITY_STYLES, type Severity } from './statusStyles'

export type ExceptionItem = {
  id: string
  severity: Extract<Severity, 'critical' | 'warn' | 'info'>
  title: string
  detail?: string
  /** Age in ms: older items first within a severity. */
  ageMs: number
  href?: string
}

const ORDER = { critical: 0, warn: 1, info: 2 } as const
const DEFAULT_LIMIT = 8

type ExceptionListProps = { items: readonly ExceptionItem[]; limit?: number }

/** "Necesita atención": severity first, then oldest; shows `limit` items and a "Ver todas" toggle. */
export function ExceptionList({ items, limit = DEFAULT_LIMIT }: ExceptionListProps) {
  const [expanded, setExpanded] = useState(false)
  const sorted = [...items].sort(
    (a, b) => ORDER[a.severity] - ORDER[b.severity] || b.ageMs - a.ageMs,
  )
  const shown = expanded ? sorted : sorted.slice(0, limit)

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{es.dashboard.exceptions.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-sm">{es.dashboard.exceptions.empty}</p>
        ) : (
          <>
            <ul className="divide-y">
              {shown.map((item) => {
                const style = SEVERITY_STYLES[item.severity]
                const Icon = style.icon
                const content = (
                  <>
                    {Icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
                    <span className="min-w-0">
                      <span className="sr-only">{es.dashboard.status[item.severity]}: </span>
                      <span className="block text-sm font-medium">{item.title}</span>
                      {item.detail && (
                        <span className="text-muted-foreground block text-xs">{item.detail}</span>
                      )}
                    </span>
                  </>
                )
                return (
                  <li
                    key={item.id}
                    data-severity={item.severity}
                    className={`border-l-4 py-2 pl-3 ${style.border}`}
                  >
                    {item.href ? (
                      <Link
                        to={item.href}
                        className="focus-visible:ring-ring flex gap-2 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="flex gap-2">{content}</div>
                    )}
                  </li>
                )
              })}
            </ul>
            {sorted.length > limit && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded
                  ? es.dashboard.exceptions.showLess
                  : es.dashboard.exceptions.showAll(sorted.length)}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
