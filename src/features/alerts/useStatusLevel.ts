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
import { computeStatusLevel, type HospitalStatus } from '@/domain/alerts'
import { computeCensus, computeEd } from '@/domain/kpis'
import { useAlertConfig } from './useAlertConfig'

/**
 * The hospital status level (and why), recomputed when the data or the thresholds change or the
 * simulated minute turns — not on every clock tick. `undefined` while loading.
 */
export function useStatusLevel(): HospitalStatus | undefined {
  const beds = useBeds()
  const units = useUnits()
  const admissions = useAdmissions()
  const patients = usePatients()
  const edVisits = useEdVisits()
  const bedRequests = useBedRequests()
  const specialties = useSpecialties()
  const simNow = useSimNow()
  const config = useAlertConfig()
  const minute = simNow?.slice(0, 16)

  return useMemo(() => {
    if (!beds || !units || !admissions || !patients || !edVisits || !bedRequests || !specialties) {
      return undefined
    }
    if (!minute || !simNow) return undefined
    const now = `${minute}:00.000Z`
    const census = computeCensus({ beds, units, admissions, patients, now })
    const ed = computeEd({
      edVisits,
      admissions,
      bedRequests,
      beds,
      units,
      patients,
      specialties,
      now,
    })
    return computeStatusLevel(census, ed, config)
    // `simNow` itself is deliberately not a dependency: only its minute matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beds, units, admissions, patients, edVisits, bedRequests, specialties, minute, config])
}
