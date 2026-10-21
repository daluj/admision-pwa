import { useMemo } from 'react'
import {
  useAdmissions,
  useBedRequests,
  useBeds,
  useEdVisits,
  usePatients,
  usePorters,
  useSimNow,
  useSpecialties,
  useTransferRequests,
  useUnits,
} from '@/data/hooks'
import { computeOverview, type Overview } from '@/domain/alerts'
import { useAlertConfig } from '@/features/alerts/useAlertConfig'

/**
 * The control-tower overview, recomputed when the data or the thresholds change or the simulated
 * minute turns (not on every clock tick); `undefined` while loading.
 */
export function useOverview(): { overview: Overview; now: string } | undefined {
  const beds = useBeds()
  const units = useUnits()
  const admissions = useAdmissions()
  const patients = usePatients()
  const edVisits = useEdVisits()
  const bedRequests = useBedRequests()
  const specialties = useSpecialties()
  const transfers = useTransferRequests()
  const porters = usePorters()
  const simNow = useSimNow()
  const config = useAlertConfig()
  const minute = simNow?.slice(0, 16)

  return useMemo(() => {
    if (
      !beds ||
      !units ||
      !admissions ||
      !patients ||
      !edVisits ||
      !bedRequests ||
      !specialties ||
      !transfers ||
      !porters ||
      !minute
    ) {
      return undefined
    }
    const now = `${minute}:00.000Z`
    return {
      now,
      overview: computeOverview(
        {
          beds,
          units,
          admissions,
          patients,
          edVisits,
          bedRequests,
          specialties,
          transfers,
          porters,
          now,
        },
        config,
      ),
    }
  }, [
    beds,
    units,
    admissions,
    patients,
    edVisits,
    bedRequests,
    specialties,
    transfers,
    porters,
    minute,
    config,
  ])
}
