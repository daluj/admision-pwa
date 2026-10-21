import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useDataBackend } from '@/data/dataContext'
import { useSimulationState } from '@/data/hooks'
import { executeCommand, pauseSimulation } from '@/domain/commands'
import { useSimulationClock } from '@/features/simulation/simulationClockContext'
import { useSession } from '@/features/auth/useSession'
import { es } from '@/i18n/es'
import { formatDateTime } from '@/lib/time'
import { getScenario, jumpToTimeOfDay } from '@/simulator'

const copy = es.timelapse

export type TimeLapse = {
  running: boolean
  /** 0–1 while jumping. */
  fraction: number
  at: string | null
  start: (hour: number, minute: number) => Promise<void>
  cancel: () => void
  error: string | null
}

const hhmm = (iso: string) => formatDateTime(iso).slice(-5)

/**
 * "Avance rápido": pauses the live run, plays the simulation headlessly up to the next time of
 * day and leaves it paused there. Only one jump at a time; it can be cancelled between chunks.
 */
export function useTimeLapse(): TimeLapse {
  const backend = useDataBackend()
  const clock = useSimulationClock()
  const state = useSimulationState()
  const session = useSession()
  const actor = session.status === 'authenticated' ? session.user.id : 'simulator'
  const [running, setRunning] = useState(false)
  const [fraction, setFraction] = useState(0)
  const [at, setAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelled = useRef(false)

  const start = useCallback(
    async (hour: number, minute: number) => {
      setError(null)
      if (!state) return setError(copy.notSeeded)
      const scenario = getScenario(state.scenarioId)
      if (!scenario) return setError(copy.unknownScenario)
      cancelled.current = false
      setRunning(true)
      setFraction(0)
      setAt(state.simNow)
      try {
        // Nothing else may write the clock while we play the minutes.
        if (state.running) {
          await executeCommand(
            { backend, clock, newId: () => crypto.randomUUID(), actor },
            pauseSimulation,
            {},
          )
        }
        const result = await jumpToTimeOfDay(backend, scenario, {
          hour,
          minute,
          isCancelled: () => cancelled.current,
          onProgress: ({ fraction: f, at: reached }) => {
            setFraction(f)
            setAt(reached)
          },
        })
        toast.success(
          result.cancelled ? copy.cancelled(hhmm(result.reached)) : copy.done(hhmm(result.reached)),
        )
      } catch (e) {
        console.error(e)
        setError(copy.failed)
      } finally {
        setRunning(false)
      }
    },
    [backend, clock, state, actor],
  )

  return { running, fraction, at, start, cancel: () => void (cancelled.current = true), error }
}
