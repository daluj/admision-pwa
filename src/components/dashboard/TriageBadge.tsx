import type { TriageLevel } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'

/** Manchester colours are a fixed clinical convention: always shown with the level number. */
const STYLES: Record<TriageLevel, string> = {
  1: 'bg-triage-1 text-triage-1-foreground',
  2: 'bg-triage-2 text-triage-2-foreground',
  3: 'bg-triage-3 text-triage-3-foreground',
  4: 'bg-triage-4 text-triage-4-foreground',
  5: 'bg-triage-5 text-triage-5-foreground',
}

type TriageBadgeProps = { level: TriageLevel; className?: string }

export function TriageBadge({ level, className }: TriageBadgeProps) {
  return (
    <span
      data-level={level}
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-md text-xs font-bold tabular-nums',
        STYLES[level],
        className,
      )}
    >
      <span className="sr-only">{es.dashboard.triage(level)}: </span>
      <span aria-hidden="true">{level}</span>
    </span>
  )
}
