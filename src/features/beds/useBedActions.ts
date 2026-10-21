import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useDataBackend } from '@/data/dataContext'
import {
  blockBed,
  executeCommand,
  finishCleaning,
  InvalidCommandError,
  releaseBedReservation,
  reserveBed,
  startCleaning,
  unblockBed,
} from '@/domain/commands'
import { canActOnBed, type BedAction } from '@/domain/access'
import { CENSUS_THRESHOLDS } from '@/domain/kpis'
import type { Id } from '@/domain/schemas'
import { InvalidTransitionError } from '@/domain/state-machines'
import { useSession } from '@/features/auth/useSession'
import { useSimulationClock } from '@/features/simulation/simulationClockContext'
import { es } from '@/i18n/es'
import { addMinutes } from '@/lib/time'

const copy = es.pages.beds.actions

/**
 * What a person asks for. `bedLabel` / `initials` only feed the confirmation toast. The unit is
 * never part of the request: permission is judged on the bed's own unit.
 */
export type BedActionRequest =
  | { action: 'reserve'; bedRequestId: Id; bedId: Id; bedLabel: string; initials?: string }
  | {
      action: 'release'
      bedId: Id
      bedLabel: string
      reason?: string
      /** The reservation the person saw; a different one makes the release stale. */
      expectedAdmissionId?: Id
    }
  | { action: 'block'; bedId: Id; bedLabel: string; reason: string }
  | { action: 'unblock' | 'startCleaning' | 'finishCleaning'; bedId: Id; bedLabel: string }

export type BedActionResult =
  { ok: true } | { ok: false; reason: 'forbidden' | 'stale' | 'failed'; message: string }

const failure = (reason: 'forbidden' | 'stale' | 'failed'): BedActionResult => ({
  ok: false,
  reason,
  message: copy.errors[reason],
})

/**
 * Bed actions for the logged-in user: checks `canActOnBed` first (refusing without writing), runs
 * the matching domain command stamped with the simulated time and the user as actor, and toasts
 * the result. Stale input (the simulator was faster) comes back as `{ ok: false, reason: 'stale' }`.
 */
export function useBedActions() {
  const backend = useDataBackend()
  const clock = useSimulationClock()
  const session = useSession()
  const [busy, setBusy] = useState(false)

  const role = session.status === 'authenticated' ? session.user.role : null
  const userId = session.status === 'authenticated' ? session.user.id : null
  const userUnitId = session.status === 'authenticated' ? session.user.unitId : undefined

  const canAct = useCallback(
    (action: BedAction, unitId: Id) =>
      role !== null && canActOnBed(role, action, { unitId, userUnitId }),
    [role, userUnitId],
  )

  const perform = useCallback(
    async (request: BedActionRequest): Promise<BedActionResult> => {
      if (userId === null) return failure('forbidden')
      // Permission is judged on the bed's real unit, read here — never on what the caller says.
      const target = await backend.repositories.bed.get(request.bedId)
      if (!target) return failure('stale')
      if (!canAct(request.action, target.unitId)) return failure('forbidden')
      const deps = { backend, clock, newId: () => crypto.randomUUID(), actor: userId }

      setBusy(true)
      try {
        switch (request.action) {
          case 'reserve':
            await executeCommand(deps, reserveBed, {
              bedRequestId: request.bedRequestId,
              bedId: request.bedId,
              etaAt: addMinutes(clock.now(), CENSUS_THRESHOLDS.reservationEtaMin),
            })
            toast.success(copy.toast.reserve(request.bedLabel, request.initials ?? ''))
            break
          case 'release':
            await executeCommand(deps, releaseBedReservation, {
              bedId: request.bedId,
              ...(request.reason ? { reason: request.reason } : {}),
              ...(request.expectedAdmissionId
                ? { expectedAdmissionId: request.expectedAdmissionId }
                : {}),
            })
            toast.success(copy.toast.release(request.bedLabel))
            break
          case 'block':
            await executeCommand(deps, blockBed, { bedId: request.bedId, reason: request.reason })
            toast.success(copy.toast.block(request.bedLabel))
            break
          case 'unblock':
            await executeCommand(deps, unblockBed, { bedId: request.bedId })
            toast.success(copy.toast.unblock(request.bedLabel))
            break
          case 'startCleaning':
            await executeCommand(deps, startCleaning, { bedId: request.bedId })
            toast.success(copy.toast.startCleaning(request.bedLabel))
            break
          case 'finishCleaning':
            await executeCommand(deps, finishCleaning, { bedId: request.bedId })
            toast.success(copy.toast.finishCleaning(request.bedLabel))
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
    [backend, clock, userId, canAct],
  )

  return { busy, canAct, perform }
}
