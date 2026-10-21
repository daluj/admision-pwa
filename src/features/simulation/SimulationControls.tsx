import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SIMULATION_SPEEDS, type SimulationSpeed } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { useSession } from '@/features/auth/useSession'
import { useSimulationControls } from './useSimulationControls'

const isSpeed = (value: string): value is `${SimulationSpeed}` =>
  SIMULATION_SPEEDS.some((speed) => String(speed) === value)

/** Play/pause and speed. Only the head of admissions runs the simulation. */
export function SimulationControls() {
  const session = useSession()
  const { state, busy, start, pause, setSpeed } = useSimulationControls()
  if (session.status !== 'authenticated' || session.user.role !== 'ADMISSIONS_HEAD') return null
  if (!state) return null

  const running = state.running
  return (
    <div role="group" aria-label={es.simulation.controls} className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        disabled={busy}
        onClick={running ? pause : start}
        aria-label={running ? es.simulation.pause : es.simulation.start}
        title={running ? es.simulation.running : es.simulation.paused}
      >
        {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="hidden tabular-nums sm:inline-flex"
            aria-label={`${es.simulation.speed}: ${es.simulation.speedOption(state.speed)}`}
          >
            {es.simulation.speedOption(state.speed)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={String(state.speed)}
            onValueChange={(value) => {
              if (isSpeed(value)) void setSpeed(Number(value) as SimulationSpeed)
            }}
          >
            {SIMULATION_SPEEDS.map((speed) => (
              <DropdownMenuRadioItem key={speed} value={String(speed)}>
                {es.simulation.speedOption(speed)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
