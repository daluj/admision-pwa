import { OctagonAlert, TriangleAlert } from 'lucide-react'
import { es } from '@/i18n/es'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

type DurationTextProps = {
  from: string
  now: string
  /** Turns amber at `warnMs` and red at `criticalMs`. */
  target?: { warnMs: number; criticalMs: number }
  className?: string
}

/** Elapsed time between two instants ("2 h 15 min"), coloured against an optional target. */
export function DurationText({ from, now, target, className }: DurationTextProps) {
  const ms = Math.max(0, Date.parse(now) - Date.parse(from))
  const level = !target
    ? 'ok'
    : ms >= target.criticalMs
      ? 'critical'
      : ms >= target.warnMs
        ? 'warn'
        : 'ok'
  return (
    <span
      data-level={level}
      className={cn(
        'tabular-nums',
        level === 'warn' && 'bg-status-warn text-status-warn-foreground rounded px-1 font-medium',
        level === 'critical' && 'text-status-critical font-semibold',
        className,
      )}
    >
      {/* Colour is never the only signal: late waits also carry an icon and a text alternative. */}
      {level === 'warn' && <TriangleAlert className="mr-0.5 inline size-3" aria-hidden="true" />}
      {level === 'critical' && <OctagonAlert className="mr-0.5 inline size-3" aria-hidden="true" />}
      {level !== 'ok' && <span className="sr-only">{es.dashboard.late[level]}: </span>}
      {formatDuration(ms)}
    </span>
  )
}
