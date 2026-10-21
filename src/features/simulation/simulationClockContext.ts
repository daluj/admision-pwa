import { createContext, useContext } from 'react'
import type { Clock } from '@/data/ports'

export const SimulationClockContext = createContext<Clock | null>(null)

/** The simulated clock, for commands issued from the UI (control events are stamped with it). */
export function useSimulationClock(): Clock {
  const clock = useContext(SimulationClockContext)
  if (!clock) throw new Error('useSimulationClock must be used inside <SimulationClockProvider>')
  return clock
}
