import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'
import { SEVERITY_STYLES, type Severity } from './statusStyles'

export type KpiTileProps = {
  label: string
  value: ReactNode
  unit?: string
  /** One line of context under the value ("12 de 60 camas operativas"). */
  context?: string
  /** Target or threshold line ("umbral de alerta 92 %"). */
  target?: string
  status?: Severity
  /** Makes the whole tile a link (drill-down). */
  href?: string
}

/** A headline number. Must be rendered inside `KpiStrip` (it is a list item). */
export function KpiTile({
  label,
  value,
  unit,
  context,
  target,
  status = 'neutral',
  href,
}: KpiTileProps) {
  const style = SEVERITY_STYLES[status]
  const Icon = style.icon
  const statusText = es.dashboard.status[status]

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-sm">{label}</p>
        {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      </div>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-muted-foreground text-sm">{unit}</span>}
      </p>
      <div className="text-muted-foreground mt-1 min-h-8 text-xs">
        {context && <p>{context}</p>}
        {target && <p>{target}</p>}
      </div>
      {statusText && <span className="sr-only">{statusText}</span>}
    </>
  )

  const classes = cn(
    'bg-card text-card-foreground block h-full rounded-lg border border-l-4 p-4 shadow-xs',
    style.border,
    href &&
      'hover:bg-accent focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none',
  )

  return (
    <li className="min-w-0" data-status={status}>
      {href ? (
        <Link to={href} className={classes}>
          {body}
        </Link>
      ) : (
        <div className={classes}>{body}</div>
      )}
    </li>
  )
}
