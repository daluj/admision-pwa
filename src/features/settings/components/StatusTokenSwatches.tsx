import { Ban, CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { es } from '@/i18n/es'

const copy = es.pages.settings

const STATUS: ReadonlyArray<{
  key: keyof typeof copy.statusTokens
  className: string
  icon: LucideIcon
}> = [
  { key: 'ok', className: 'bg-status-ok text-status-ok-foreground', icon: CircleCheck },
  { key: 'warn', className: 'bg-status-warn text-status-warn-foreground', icon: TriangleAlert },
  {
    key: 'critical',
    className: 'bg-status-critical text-status-critical-foreground',
    icon: CircleAlert,
  },
  { key: 'info', className: 'bg-status-info text-status-info-foreground', icon: Info },
  { key: 'neutral', className: 'bg-status-neutral text-status-neutral-foreground', icon: Ban },
]

const TRIAGE: ReadonlyArray<{ level: number; className: string }> = [
  { level: 1, className: 'bg-triage-1 text-triage-1-foreground' },
  { level: 2, className: 'bg-triage-2 text-triage-2-foreground' },
  { level: 3, className: 'bg-triage-3 text-triage-3-foreground' },
  { level: 4, className: 'bg-triage-4 text-triage-4-foreground' },
  { level: 5, className: 'bg-triage-5 text-triage-5-foreground' },
]

/** Temporary swatch of the semantic colour tokens, to check both themes (Phase 1 validation). */
export function StatusTokenSwatches() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.tokensTitle}</CardTitle>
        <CardDescription>{copy.tokensDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-wrap gap-2">
          {STATUS.map(({ key, className, icon: Icon }) => (
            <li
              key={key}
              className={`${className} flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {copy.statusTokens[key]}
            </li>
          ))}
        </ul>
        <div>
          <h3 className="mb-2 text-sm font-medium">{copy.triageTitle}</h3>
          <ul className="flex flex-wrap gap-2">
            {TRIAGE.map(({ level, className }) => (
              <li
                key={level}
                className={`${className} rounded-md px-3 py-1.5 text-sm font-semibold tabular-nums`}
              >
                {copy.triageLevel(level)}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
