import { useEffect } from 'react'
import { useDataBackend } from '@/data/dataContext'
import { runAlertEvaluation } from '@/domain/commands'
import { SIMULATION_STATE_ID } from '@/domain/schemas'
import { runAsLeader } from '@/simulator'
import { ALERT_CONFIG_STORAGE_KEY, readAlertConfig } from './alertConfigStore'

export const ALERT_LOCK_NAME = 'torre-control-alerts'
export const ALERT_POLL_MS = 2000

/**
 * Keeps the alerts up to date: in exactly one tab (its own Web Lock), every couple of seconds it
 * evaluates the rules when the simulated minute, the event log or the thresholds changed. It
 * renders nothing. Evaluations are commands (`expectedLastSeq`), so two writers cannot duplicate.
 */
export function AlertEvaluatorHost() {
  const backend = useDataBackend()
  useEffect(() => {
    const leadership = runAsLeader(
      () => {
        let busy = false
        let stopped = false
        let lastKey = ''

        const signature = async (simNow: string) =>
          `${simNow.slice(0, 16)}|${await backend.events.lastSeq()}|${window.localStorage.getItem(ALERT_CONFIG_STORAGE_KEY) ?? ''}`

        const evaluate = async () => {
          if (busy || stopped) return
          busy = true
          try {
            const state = await backend.repositories.simulationState.get(SIMULATION_STATE_ID)
            if (!state) return
            const before = await signature(state.simNow)
            if (before === lastKey) return
            await runAlertEvaluation(
              { backend, clock: { now: () => state.simNow }, newId: () => crypto.randomUUID() },
              readAlertConfig(),
            )
            // Our own events moved the log: remember the state after them as handled.
            lastKey = await signature(state.simNow)
          } catch (error) {
            console.error('[alerts]', error)
          } finally {
            busy = false
          }
        }

        const timer = setInterval(() => void evaluate(), ALERT_POLL_MS)
        void evaluate()
        return () => {
          stopped = true
          clearInterval(timer)
        }
      },
      undefined,
      ALERT_LOCK_NAME,
    )
    return leadership.stop
  }, [backend])
  return null
}
