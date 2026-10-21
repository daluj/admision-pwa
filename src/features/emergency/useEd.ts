import { useMemo } from 'react'
import {
  useAdmissions,
  useBedRequests,
  useBeds,
  useEdVisits,
  usePatients,
  useSimNow,
  useSpecialties,
  useUnits,
} from '@/data/hooks'
import { computeEd, type Ed } from '@/domain/kpis'

/** Live Urgencias dashboard data; `undefined` while any source is still loading. */
export function useEd(): { ed: Ed; now: string; hasVisits: boolean } | undefined {
  const edVisits = useEdVisits()
  const admissions = useAdmissions()
  const bedRequests = useBedRequests()
  const beds = useBeds()
  const units = useUnits()
  const patients = usePatients()
  const specialties = useSpecialties()
  const now = useSimNow()

  return useMemo(
    () =>
      edVisits && admissions && bedRequests && beds && units && patients && specialties && now
        ? {
            now,
            hasVisits: edVisits.length > 0,
            ed: computeEd({
              edVisits,
              admissions,
              bedRequests,
              beds,
              units,
              patients,
              specialties,
              now,
            }),
          }
        : undefined,
    [edVisits, admissions, bedRequests, beds, units, patients, specialties, now],
  )
}
