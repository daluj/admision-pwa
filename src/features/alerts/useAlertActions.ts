import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useDataBackend } from '@/data/dataContext'
import { acknowledgeAlert, executeCommand, InvalidCommandError } from '@/domain/commands'
import { canAcknowledgeAlert } from '@/domain/access'
import type { Id } from '@/domain/schemas'
import { useSession } from '@/features/auth/useSession'
import { useSimulationClock } from '@/features/simulation/simulationClockContext'
import { es } from '@/i18n/es'

const copy = es.alerts.centre

export type AlertActionResult =
  { ok: true } | { ok: false; reason: 'forbidden' | 'stale' | 'failed'; message: string }

const failure = (reason: 'forbidden' | 'stale' | 'failed'): AlertActionResult => ({
  ok: false,
  reason,
  message: copy.errors[reason],
})

/** Acknowledging alerts as the logged-in user (not porters), with the simulated clock. */
export function useAlertActions() {
  const backend = useDataBackend()
  const clock = useSimulationClock()
  const session = useSession()
  const [busy, setBusy] = useState(false)
  const role = session.status === 'authenticated' ? session.user.role : null
  const userId = session.status === 'authenticated' ? session.user.id : null
  const canAcknowledge = role !== null && canAcknowledgeAlert(role)

  const acknowledge = useCallback(
    async (alertId: Id): Promise<AlertActionResult> => {
      if (userId === null || !canAcknowledge) return failure('forbidden')
      setBusy(true)
      try {
        await executeCommand(
          { backend, clock, newId: () => crypto.randomUUID(), actor: userId },
          acknowledgeAlert,
          { alertId },
        )
        toast.success(copy.toast)
        return { ok: true }
      } catch (error) {
        if (error instanceof InvalidCommandError) return failure('stale')
        console.error(error)
        return failure('failed')
      } finally {
        setBusy(false)
      }
    },
    [backend, clock, userId, canAcknowledge],
  )

  return { busy, canAcknowledge, acknowledge }
}
