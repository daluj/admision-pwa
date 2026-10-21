import { useMemo } from 'react'
import {
  useAdmissions,
  useBeds,
  useEdVisits,
  usePatients,
  useRecentEvents,
  useSimNow,
  useSpecialties,
  useUnits,
} from '@/data/hooks'
import { computeAdmissions, type Admissions, type AdmissionScope } from '@/domain/kpis'
import { useUnitScope } from '@/features/auth/useUnitScope'

/** Enough to cover a simulated day of cancellations (same window as the bed turnaround). */
export const ADMISSIONS_EVENT_WINDOW = 5000

export type AdmissionsData = {
  data: Admissions
  now: string
  /** A nurse supervisor sees their own unit only (`restricted`), possibly none (`unitName` empty). */
  restricted: boolean
  unitName?: string
}

/** Live data for Ingresos y altas; `undefined` while loading. Supervisors are scoped to their unit. */
export function useAdmissionsData(): AdmissionsData | undefined {
  const admissions = useAdmissions()
  const beds = useBeds()
  const units = useUnits()
  const patients = usePatients()
  const specialties = useSpecialties()
  const edVisits = useEdVisits()
  const events = useRecentEvents(ADMISSIONS_EVENT_WINDOW)
  const now = useSimNow()
  const scope = useUnitScope()

  return useMemo(() => {
    if (
      !admissions ||
      !beds ||
      !units ||
      !patients ||
      !specialties ||
      !edVisits ||
      !events ||
      !now
    ) {
      return undefined
    }
    let limit: AdmissionScope | undefined
    let unitName: string | undefined
    if (scope.restricted) {
      // Fails closed: a supervisor without a (known) unit sees nothing.
      const own = units.find((u) => u.id === scope.unitId)
      limit = {
        unitIds: new Set(own ? [own.id] : []),
        specialtyCodes: new Set(own?.specialtyCodes ?? []),
      }
      unitName = own?.name
    }
    return {
      now,
      restricted: scope.restricted,
      ...(unitName ? { unitName } : {}),
      data: computeAdmissions({
        admissions,
        beds,
        units,
        patients,
        specialties,
        edVisits,
        events,
        now,
        ...(limit ? { scope: limit } : {}),
      }),
    }
  }, [admissions, beds, units, patients, specialties, edVisits, events, now, scope])
}
