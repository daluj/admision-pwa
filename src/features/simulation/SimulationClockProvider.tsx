import { useEffect, useMemo, type ReactNode } from 'react'
import { useDataBackend } from '@/data/dataContext'
import { createSimulationClock } from '@/simulator'
import { SimulationClockContext } from './simulationClockContext'

export function SimulationClockProvider({ children }: { children: ReactNode }) {
  const backend = useDataBackend()
  const clock = useMemo(() => createSimulationClock(backend.repositories, backend.clock), [backend])
  useEffect(() => () => clock.dispose(), [clock])
  return <SimulationClockContext.Provider value={clock}>{children}</SimulationClockContext.Provider>
}
