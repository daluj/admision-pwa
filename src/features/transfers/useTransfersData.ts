import { useMemo } from 'react'
import { usePatients, usePorters, useSimNow, useTransferRequests } from '@/data/hooks'
import { computeTransfers, type Transfers } from '@/domain/kpis'
import { useSession } from '@/features/auth/useSession'

export type TransfersData = { data: Transfers; now: string }

/** Live data for Traslados; `undefined` while loading. `data.mine` is set for a porter login. */
export function useTransfersData(): TransfersData | undefined {
  const transfers = useTransferRequests()
  const porters = usePorters()
  const patients = usePatients()
  const now = useSimNow()
  const session = useSession()
  const porterId = session.status === 'authenticated' ? (session.user.porterId ?? null) : null

  return useMemo(() => {
    if (!transfers || !porters || !patients || !now) return undefined
    return { now, data: computeTransfers({ transfers, porters, patients, now, porterId }) }
  }, [transfers, porters, patients, now, porterId])
}
