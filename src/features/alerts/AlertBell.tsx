import { Bell } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'
import { AlertCentre } from './components/AlertCentre'
import { useVisibleAlerts } from './useVisibleAlerts'

const copy = es.topBar.alerts
const BADGE_STYLE = {
  CRITICAL: 'bg-status-critical text-status-critical-foreground',
  WARNING: 'bg-status-warn text-status-warn-foreground',
  INFO: 'bg-status-info text-status-info-foreground',
} as const

/** Top-bar bell: how many open alerts nobody has acknowledged yet, coloured by the worst; opens the alert centre. */
export function AlertBell() {
  const summary = useVisibleAlerts()
  const [open, setOpen] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)
  const count = summary?.unacknowledged ?? 0
  const description =
    count === 0
      ? copy.empty
      : copy.pending(count, es.alerts.centre.severities[summary?.worst ?? 'WARNING'].toLowerCase())

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            ref={bellRef}
            className="relative"
            aria-label={`${copy.label}: ${description}`}
            onClick={() => setOpen(true)}
          >
            <Bell aria-hidden="true" />
            <span
              aria-hidden="true"
              data-severity={summary?.worst ?? undefined}
              // The number is drawn by CSS (not text): the button's accessible name already says it,
              // and visible text that is not part of the name would fail the WCAG "label in name" rule.
              data-count={count}
              className={cn(
                'after:content-[attr(data-count)] absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold tabular-nums',
                count > 0 && summary?.worst
                  ? BADGE_STYLE[summary.worst]
                  : 'bg-muted text-muted-foreground',
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
      <AlertCentre
        open={open}
        onOpenChange={setOpen}
        onCloseAutoFocus={(event) => {
          // The bell is not a Radix trigger: hand the focus back to it ourselves.
          event.preventDefault()
          bellRef.current?.focus()
        }}
        summary={summary ?? { open: [], unacknowledged: 0, worst: null, resolved: [] }}
      />
    </>
  )
}
