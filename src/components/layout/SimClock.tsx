import { Clock } from 'lucide-react'
import { es } from '@/i18n/es'

type SimClockProps = {
  /** Simulated time (HH:mm). Static placeholder until the simulated Clock exists (Phase 5). */
  time?: string
}

export function SimClock({ time = '08:00' }: SimClockProps) {
  return (
    <div
      className="text-muted-foreground hidden items-center gap-1.5 text-sm sm:flex"
      title={es.topBar.clock.label}
    >
      <Clock className="size-4" aria-hidden="true" />
      <span className="sr-only">{es.topBar.clock.label}: </span>
      <time dateTime={time} className="text-foreground font-medium tabular-nums">
        {time}
      </time>
    </div>
  )
}
