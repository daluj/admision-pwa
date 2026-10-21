import { useEffect } from 'react'
import { useDataBackend } from '@/data/dataContext'
import { createSimulationRunner, getScenario, runAsLeader } from '@/simulator'

/**
 * Runs the simulator in exactly one tab (the Web Lock leader). It renders nothing; the runner
 * only advances time while `SimulationState.running` is true.
 */
export function SimulationRunnerHost() {
  const backend = useDataBackend()
  useEffect(() => {
    const leadership = runAsLeader(() => {
      const runner = createSimulationRunner({
        backend,
        getScenario,
        monotonicNow: () => performance.now(),
      })
      runner.start()
      return () => runner.stop()
    })
    return leadership.stop
  }, [backend])
  return null
}
