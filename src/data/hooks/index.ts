import { useDataBackend } from '@/data/dataContext'
import type { DataBackendInfo, TableCounts } from '@/data/ports'
import type {
  Admission,
  Alert,
  Bed,
  BedRequest,
  EdVisit,
  HospitalEvent,
  Id,
  IsoDateTime,
  Patient,
  Porter,
  SimulationState,
  Specialty,
  TransferRequest,
  Unit,
  User,
} from '@/domain/schemas'
import { sharedSource, useSubscribable } from './useSubscribable'

export { sharedSource, useSubscribable } from './useSubscribable'

/** Which adapter is in use and its schema version. */
export function useDataInfo(): DataBackendInfo {
  return useDataBackend().info
}

/** Live row count per table plus the event log; `undefined` while loading. */
export function useTableCounts(): TableCounts | undefined {
  const backend = useDataBackend()
  return useSubscribable(sharedSource(backend, 'tableCounts', () => backend.observeTableCounts()))
}

export function useUnits(): Unit[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    sharedSource(repositories, 'unit:list', () => repositories.unit.observeList()),
  )
}

export function useSpecialties(): Specialty[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    sharedSource(repositories, 'specialty:list', () => repositories.specialty.observeList()),
  )
}

export function usePatients(): Patient[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    sharedSource(repositories, 'patient:list', () => repositories.patient.observeList()),
  )
}

export function useAdmissions(): Admission[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    sharedSource(repositories, 'admission:list', () => repositories.admission.observeList()),
  )
}

export function useBedRequests(): BedRequest[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    sharedSource(repositories, 'bedRequest:list', () => repositories.bedRequest.observeList()),
  )
}

export function useEdVisits(): EdVisit[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    sharedSource(repositories, 'edVisit:list', () => repositories.edVisit.observeList()),
  )
}

export function useUsers(): User[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    sharedSource(repositories, 'user:list', () => repositories.user.observeList()),
  )
}

export function useBeds(): Bed[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    sharedSource(repositories, 'bed:list', () => repositories.bed.observeList()),
  )
}

export function useBedsByUnit(unitId: Id): Bed[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    sharedSource(repositories, `bedsByUnit:${unitId}`, () =>
      repositories.bed.observeBedsByUnit(unitId),
    ),
  )
}

/** The singleton simulator state; `null` when not seeded yet, `undefined` while loading. */
export function useSimulationState(): SimulationState | null | undefined {
  const { repositories } = useDataBackend()
  const rows = useSubscribable(
    sharedSource(repositories, 'simulationState:list', () =>
      repositories.simulationState.observeList(),
    ),
  )
  return rows === undefined ? undefined : (rows[0] ?? null)
}

/** The latest `limit` events, newest first. */
export function useRecentEvents(limit: number): HospitalEvent[] | undefined {
  const { events } = useDataBackend()
  return useSubscribable(sharedSource(events, `recent:${limit}`, () => events.observeRecent(limit)))
}

/** The simulated "now" (`SimulationState.simNow`); `undefined` until the demo is seeded. Dashboards use this, never the wall clock. */
export function useSimNow(): IsoDateTime | undefined {
  return useSimulationState()?.simNow
}

export function usePorters(): Porter[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    sharedSource(repositories, 'porter:list', () => repositories.porter.observeList()),
  )
}

export function useTransferRequests(): TransferRequest[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    sharedSource(repositories, 'transferRequest:list', () =>
      repositories.transferRequest.observeList(),
    ),
  )
}

export function useAlerts(): Alert[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    sharedSource(repositories, 'alert:list', () => repositories.alert.observeList()),
  )
}
