import { useMemo } from 'react'
import { useAlerts } from '@/data/hooks'
import { summarizeAlerts, visibleAlerts, type AlertSummary } from '@/domain/alerts'
import { useSession } from '@/features/auth/useSession'

/** The alerts the logged-in user may see (role and unit scope), summarised; `undefined` while loading. */
export function useVisibleAlerts(): AlertSummary | undefined {
  const alerts = useAlerts()
  const session = useSession()
  const role = session.status === 'authenticated' ? session.user.role : null
  const unitId = session.status === 'authenticated' ? session.user.unitId : undefined
  return useMemo(() => {
    if (!alerts) return undefined
    if (role === null) return summarizeAlerts([])
    return summarizeAlerts(visibleAlerts(alerts, { role, unitId }))
  }, [alerts, role, unitId])
}
