import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useDataBackend } from '@/data/dataContext'
import {
  assignTransfer,
  cancelTransfer,
  deliverTransfer,
  executeCommand,
  InvalidCommandError,
  pickUpTransfer,
  requestTransfer,
  type RequestTransferInput,
} from '@/domain/commands'
import { canActOnTransfer } from '@/domain/access'
import type { Id } from '@/domain/schemas'
import { InvalidTransitionError } from '@/domain/state-machines'
import { useSession } from '@/features/auth/useSession'
import { useSimulationClock } from '@/features/simulation/simulationClockContext'
import { es } from '@/i18n/es'

const copy = es.pages.transfers.actions

/** `label` (initials and destination) only feeds the confirmation toast. */
export type TransferRequestAction =
  | { action: 'create'; input: RequestTransferInput; label: string }
  | { action: 'assign'; transferId: Id; porterId: Id; label: string }
  | { action: 'cancel'; transferId: Id; label: string; reason?: string }
  | { action: 'accept' | 'pickUp' | 'deliver'; transferId: Id; label: string }

export type TransferActionResult =
  { ok: true } | { ok: false; reason: 'forbidden' | 'stale' | 'failed'; message: string }

const failure = (reason: 'forbidden' | 'stale' | 'failed'): TransferActionResult => ({
  ok: false,
  reason,
  message: copy.errors[reason],
})

/**
 * Transfer actions for the logged-in user. For porter actions permission is judged on the
 * transfer's own porter and the login's porter (read here, never taken from the caller) and fails
 * closed; `accept` assigns the transfer to the user's own porter. Stale input (the simulator or
 * another person was faster) comes back as `{ ok: false, reason: 'stale' }`.
 */
export function useTransferActions() {
  const backend = useDataBackend()
  const clock = useSimulationClock()
  const session = useSession()
  const [busy, setBusy] = useState(false)

  const role = session.status === 'authenticated' ? session.user.role : null
  const userId = session.status === 'authenticated' ? session.user.id : null
  const userPorterId = session.status === 'authenticated' ? session.user.porterId : undefined

  const perform = useCallback(
    async (request: TransferRequestAction): Promise<TransferActionResult> => {
      if (userId === null || role === null) return failure('forbidden')

      let jobPorterId: Id | undefined
      if (request.action !== 'create') {
        const transfer = await backend.repositories.transferRequest.get(request.transferId)
        if (!transfer) return failure('stale')
        jobPorterId = transfer.porterId
      }
      if (!canActOnTransfer(role, request.action, { jobPorterId, userPorterId })) {
        return failure('forbidden')
      }

      const deps = { backend, clock, newId: () => crypto.randomUUID(), actor: userId }
      setBusy(true)
      try {
        switch (request.action) {
          case 'create':
            await executeCommand(deps, requestTransfer, request.input)
            toast.success(copy.toast.create(request.label))
            break
          case 'assign':
            await executeCommand(deps, assignTransfer, {
              transferId: request.transferId,
              porterId: request.porterId,
            })
            toast.success(copy.toast.assign(request.label))
            break
          case 'accept':
            await executeCommand(deps, assignTransfer, {
              transferId: request.transferId,
              porterId: userPorterId!,
            })
            toast.success(copy.toast.accept(request.label))
            break
          case 'cancel':
            await executeCommand(deps, cancelTransfer, {
              transferId: request.transferId,
              ...(request.reason ? { reason: request.reason } : {}),
            })
            toast.success(copy.toast.cancel(request.label))
            break
          case 'pickUp':
            await executeCommand(deps, pickUpTransfer, { transferId: request.transferId })
            toast.success(copy.toast.pickUp(request.label))
            break
          case 'deliver':
            await executeCommand(deps, deliverTransfer, { transferId: request.transferId })
            toast.success(copy.toast.deliver(request.label))
            break
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
    [backend, clock, userId, role, userPorterId],
  )

  const canAct = useCallback(
    (action: TransferRequestAction['action'], jobPorterId?: Id) =>
      role !== null && canActOnTransfer(role, action, { jobPorterId, userPorterId }),
    [role, userPorterId],
  )

  return { busy, canAct, perform }
}
