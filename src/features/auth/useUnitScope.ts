import type { Id } from '@/domain/schemas'
import { useSession } from './useSession'

/**
 * Which units the current user may see. Fails closed: a nurse supervisor is always
 * `restricted`, even when their user has no unit (`unitId: null`) — dashboards must then show
 * "no unit assigned", never the whole hospital.
 */
export type UnitScope = { restricted: false } | { restricted: true; unitId: Id | null }

export function useUnitScope(): UnitScope {
  const session = useSession()
  if (session.status !== 'authenticated' || session.user.role !== 'NURSE_SUPERVISOR') {
    return { restricted: false }
  }
  return { restricted: true, unitId: session.user.unitId ?? null }
}
