import { useMemo } from 'react'
import {
  useAdmissions,
  useBedRequests,
  useBeds,
  useEdVisits,
  usePatients,
  useRecentEvents,
  useSimNow,
  useTransferRequests,
  useUnits,
} from '@/data/hooks'
import {
  buildJourney,
  isPatientInScope,
  JOURNEY_EVENT_WINDOW,
  searchPatients,
  type Journey,
  type JourneyData,
  type JourneyScope,
  type SearchResult,
} from '@/domain/kpis'
import { useUnitScope } from '@/features/auth/useUnitScope'

/** Everything the journey needs, live; `undefined` while loading. */
function useJourneyInputs(): { data: JourneyData; scope: JourneyScope | undefined } | undefined {
  const patients = usePatients()
  const edVisits = useEdVisits()
  const admissions = useAdmissions()
  const bedRequests = useBedRequests()
  const transfers = useTransferRequests()
  const beds = useBeds()
  const units = useUnits()
  const events = useRecentEvents(JOURNEY_EVENT_WINDOW)
  const now = useSimNow()
  const unitScope = useUnitScope()

  return useMemo(() => {
    if (
      !patients ||
      !edVisits ||
      !admissions ||
      !bedRequests ||
      !transfers ||
      !beds ||
      !units ||
      !events ||
      !now
    ) {
      return undefined
    }
    // A nurse supervisor only reaches patients of their unit; without a unit, nobody (fails closed).
    const scope: JourneyScope | undefined = unitScope.restricted
      ? { unitIds: new Set(unitScope.unitId ? [unitScope.unitId] : []) }
      : undefined
    return {
      data: { patients, edVisits, admissions, bedRequests, transfers, beds, units, events, now },
      scope,
    }
  }, [patients, edVisits, admissions, bedRequests, transfers, beds, units, events, now, unitScope])
}

export type JourneySearch = { results: SearchResult[]; now: string; restricted: boolean }

/** Search results for a query; `undefined` while loading. */
export function useJourneySearch(query: string): JourneySearch | undefined {
  const inputs = useJourneyInputs()
  return useMemo(() => {
    if (!inputs) return undefined
    return {
      results: searchPatients(inputs.data, query, inputs.scope),
      now: inputs.data.now,
      restricted: inputs.scope !== undefined,
    }
  }, [inputs, query])
}

export type JourneyState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'ready'; journey: Journey; now: string }

/** One patient's journey. Unknown patients and patients outside the user's scope are both "notFound". */
export function useJourney(patientId: string): JourneyState {
  const inputs = useJourneyInputs()
  return useMemo((): JourneyState => {
    if (!inputs) return { status: 'loading' }
    if (inputs.scope && !isPatientInScope(patientId, inputs.data, inputs.scope)) {
      return { status: 'notFound' }
    }
    const journey = buildJourney(patientId, inputs.data, inputs.scope)
    return journey ? { status: 'ready', journey, now: inputs.data.now } : { status: 'notFound' }
  }, [inputs, patientId])
}
