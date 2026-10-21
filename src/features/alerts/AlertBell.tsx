import { Bell } from 'lucide-react'
import { useState } from 'react'
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
            className="relative"
            aria-label={`${copy.label}: ${description}`}
            onClick={() => setOpen(true)}
          >
            <Bell aria-hidden="true" />
            <span
              aria-hidden="true"
              data-severity={summary?.worst ?? undefined}
              className={cn(
                'absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold tabular-nums',
                count > 0 && summary?.worst
                  ? BADGE_STYLE[summary.worst]
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {count}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
      <AlertCentre
        open={open}
        onOpenChange={setOpen}
        summary={summary ?? { open: [], unacknowledged: 0, worst: null, resolved: [] }}
      />
    </>
  )
}
