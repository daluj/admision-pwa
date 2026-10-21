import { useMemo } from 'react'
import { useDataBackend } from '@/data/dataContext'
import type { DataBackendInfo, TableCounts } from '@/data/ports'
import type { Bed, HospitalEvent, Id, SimulationState, Unit, User } from '@/domain/schemas'
import { useSubscribable } from './useSubscribable'

export { useSubscribable } from './useSubscribable'

/** Which adapter is in use and its schema version. */
export function useDataInfo(): DataBackendInfo {
  return useDataBackend().info
}

/** Live row count per table plus the event log; `undefined` while loading. */
export function useTableCounts(): TableCounts | undefined {
  const backend = useDataBackend()
  return useSubscribable(useMemo(() => backend.observeTableCounts(), [backend]))
}

export function useUnits(): Unit[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(useMemo(() => repositories.unit.observeList(), [repositories]))
}

export function useUsers(): User[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(useMemo(() => repositories.user.observeList(), [repositories]))
}

export function useBeds(): Bed[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(useMemo(() => repositories.bed.observeList(), [repositories]))
}

export function useBedsByUnit(unitId: Id): Bed[] | undefined {
  const { repositories } = useDataBackend()
  return useSubscribable(
    useMemo(() => repositories.bed.observeBedsByUnit(unitId), [repositories, unitId]),
  )
}

/** The singleton simulator state; `null` when not seeded yet, `undefined` while loading. */
export function useSimulationState(): SimulationState | null | undefined {
  const { repositories } = useDataBackend()
  const rows = useSubscribable(
    useMemo(() => repositories.simulationState.observeList(), [repositories]),
  )
  return rows === undefined ? undefined : (rows[0] ?? null)
}

/** The latest `limit` events, newest first. */
export function useRecentEvents(limit: number): HospitalEvent[] | undefined {
  const { events } = useDataBackend()
  return useSubscribable(useMemo(() => events.observeRecent(limit), [events, limit]))
}
