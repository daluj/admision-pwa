import type { Id } from '@/domain/schemas'
import { useSession } from './useSession'

/** Unit a dashboard must be limited to: the supervisor's own unit, otherwise `null` (whole hospital). */
export function useUnitScope(): Id | null {
  const session = useSession()
  if (session.status !== 'authenticated') return null
  return session.user.role === 'NURSE_SUPERVISOR' ? (session.user.unitId ?? null) : null
}
