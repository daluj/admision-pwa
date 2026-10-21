import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useDataBackend } from '@/data/dataContext'
import {
  executeCommand,
  InvalidCommandError,
  orderDischarge,
  setExpectedDischarge,
} from '@/domain/commands'
import { canActOnDischarge, type DischargeAction } from '@/domain/access'
import type { Id, IsoDateTime } from '@/domain/schemas'
import { InvalidTransitionError } from '@/domain/state-machines'
import { useSession } from '@/features/auth/useSession'
import { useSimulationClock } from '@/features/simulation/simulationClockContext'
import { es } from '@/i18n/es'

const copy = es.pages.admissions.actions

/** `label` (bed and initials) only feeds the confirmation toast. */
export type DischargeRequest =
  | { action: 'setExpected'; admissionId: Id; expectedDischargeAt: IsoDateTime; label: string }
  | { action: 'order'; admissionId: Id; label: string }

export type DischargeResult =
  { ok: true } | { ok: false; reason: 'forbidden' | 'stale' | 'failed'; message: string }

const failure = (reason: 'forbidden' | 'stale' | 'failed'): DischargeResult => ({
  ok: false,
  reason,
  message: copy.errors[reason],
})

/**
 * Discharge actions for the logged-in user. Permission is judged on the unit of the patient's
 * own bed (read here, never taken from the caller) and fails closed; the command runs with the
 * user as actor and the simulated clock; stale input (the simulator was faster) comes back as
 * `{ ok: false, reason: 'stale' }`.
 */
export function useDischargeActions() {
  const backend = useDataBackend()
  const clock = useSimulationClock()
  const session = useSession()
  const [busy, setBusy] = useState(false)

  const role = session.status === 'authenticated' ? session.user.role : null
  const userId = session.status === 'authenticated' ? session.user.id : null
  const userUnitId = session.status === 'authenticated' ? session.user.unitId : undefined

  const canAct = useCallback(
    (action: DischargeAction, unitId: Id) =>
      role !== null && canActOnDischarge(role, action, { unitId, userUnitId }),
    [role, userUnitId],
  )

  const perform = useCallback(
    async (request: DischargeRequest): Promise<DischargeResult> => {
      if (userId === null) return failure('forbidden')
      const admission = await backend.repositories.admission.get(request.admissionId)
      const bed = admission?.bedId ? await backend.repositories.bed.get(admission.bedId) : undefined
      if (!admission || !bed) return failure('stale')
      if (!canAct(request.action, bed.unitId)) return failure('forbidden')

      const deps = { backend, clock, newId: () => crypto.randomUUID(), actor: userId }
      setBusy(true)
      try {
        if (request.action === 'setExpected') {
          await executeCommand(deps, setExpectedDischarge, {
            admissionId: request.admissionId,
            expectedDischargeAt: request.expectedDischargeAt,
          })
          toast.success(copy.toast.setExpected(request.label))
        } else {
          await executeCommand(deps, orderDischarge, { admissionId: request.admissionId })
          toast.success(copy.toast.order(request.label))
        }
        return { ok: true }
      } catch (error) {
        if (error instanceof InvalidTransitionError || error instanceof InvalidCommandError) {
          return failure('stale')
        }
        console.error(error)
        return failure('failed')
      } finally {
        setBusy(false)
      }
    },
    [backend, clock, userId, canAct],
  )

  return { busy, canAct, perform }
}
