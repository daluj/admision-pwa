import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'

type AlertBellProps = {
  count?: number
}

export function AlertBell({ count = 0 }: AlertBellProps) {
  const description = count === 0 ? es.topBar.alerts.empty : es.topBar.alerts.count(count)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`${es.topBar.alerts.label}: ${description}`}
        >
          <Bell aria-hidden="true" />
          <span
            aria-hidden="true"
            className={cn(
              'absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold tabular-nums',
              count > 0
                ? 'bg-status-critical text-status-critical-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {count}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  )
}
