import { Clock } from 'lucide-react'
import { useSimulationState } from '@/data/hooks'
import { es } from '@/i18n/es'
import { formatDateTime, HOSPITAL_TIME_ZONE } from '@/lib/time'

const hourFormatter = new Intl.DateTimeFormat('es-ES', {
  timeZone: HOSPITAL_TIME_ZONE,
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
})

/** Simulated time (HH:mm, Europe/Madrid), live from `SimulationState.simNow`. */
export function SimClock() {
  const state = useSimulationState()
  const simNow = state?.simNow
  const time = simNow ? hourFormatter.format(Date.parse(simNow)) : es.topBar.clock.unknown

  return (
    <div
      className="text-muted-foreground hidden items-center gap-1.5 text-sm sm:flex"
      title={simNow ? `${es.topBar.clock.label}: ${formatDateTime(simNow)}` : es.topBar.clock.label}
    >
      <Clock className="size-4" aria-hidden="true" />
      <span className="sr-only">{es.topBar.clock.label}: </span>
      <time dateTime={simNow} className="text-foreground font-medium tabular-nums">
        {time}
      </time>
    </div>
  )
}
