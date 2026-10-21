import { useMemo } from 'react'
import { useAdmissions, useBeds, usePatients, useSimNow, useUnits } from '@/data/hooks'
import { computeCensus, type Census } from '@/domain/kpis'
import type { Unit } from '@/domain/schemas'

/** Live data a census is built from; `undefined` while any source is still loading. */
export type CensusSource = NonNullable<ReturnType<typeof useCensusSource>>

export function useCensusSource() {
  const beds = useBeds()
  const units = useUnits()
  const admissions = useAdmissions()
  const patients = usePatients()
  const now = useSimNow()
  return useMemo(
    () =>
      beds && units && admissions && patients && now
        ? { beds, units, admissions, patients, now }
        : undefined,
    [beds, units, admissions, patients, now],
  )
}

/**
 * Live census of the units chosen by `selectUnits` (pass a stable function). `undefined` while
 * loading. Recomputed only when the underlying data or the simulated time changes.
 */
export function useCensus(
  selectUnits: (units: readonly Unit[]) => readonly Unit[] = (units) => units,
): { census: Census; now: string } | undefined {
  const source = useCensusSource()
  return useMemo(
    () =>
      source
        ? {
            now: source.now,
            census: computeCensus({ ...source, units: selectUnits(source.units) }),
          }
        : undefined,
    [source, selectUnits],
  )
}
