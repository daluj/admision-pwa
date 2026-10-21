import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useDataBackend } from '@/data/dataContext'
import { useSimulationState } from '@/data/hooks'
import {
  executeCommand,
  pauseSimulation,
  setSimulationSpeed,
  startSimulation,
  type Command,
} from '@/domain/commands'
import type { SimulationSpeed } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { useSimulationClock } from './simulationClockContext'

/** Start / pause / speed of the simulator, as commands stamped with the simulated time. */
export function useSimulationControls() {
  const backend = useDataBackend()
  const clock = useSimulationClock()
  const state = useSimulationState()
  const [busy, setBusy] = useState(false)

  const run = useCallback(
    async <I>(command: Command<I>, input: I) => {
      setBusy(true)
      try {
        await executeCommand(
          { backend, clock, newId: () => crypto.randomUUID(), actor: 'simulator' },
          command,
          input,
        )
      } catch (error) {
        console.error(error)
        toast.error(es.simulation.failed)
      } finally {
        setBusy(false)
      }
    },
    [backend, clock],
  )

  return {
    state,
    busy,
    start: () => run(startSimulation, {}),
    pause: () => run(pauseSimulation, {}),
    setSpeed: (speed: SimulationSpeed) => run(setSimulationSpeed, { speed }),
  }
}
