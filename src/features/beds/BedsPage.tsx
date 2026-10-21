import { BedDouble } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Navigate } from 'react-router'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { useSpecialties, useUnits } from '@/data/hooks'
import { censusExceptions } from '@/domain/kpis'
import type { Unit } from '@/domain/schemas'
import { useSession } from '@/features/auth/useSession'
import { useUnitScope } from '@/features/auth/useUnitScope'
import { es } from '@/i18n/es'
import { applyFilters, filterOptions, hasActiveFilters } from './bedFilters'
import { BedFilters } from './components/BedFilters'
import { CensusExceptions } from './components/CensusExceptions'
import { CensusKpis } from './components/CensusKpis'
import { UnitGrid } from './components/UnitGrid'
import { useBedFilters } from './useBedFilters'
import { useCensus } from './useCensus'

const copy = es.pages.beds

/** `/camas`: the hospital census. Nurse supervisors go straight to their own unit. */
export default function BedsPage() {
  const session = useSession()
  const scope = useUnitScope()
  const units = useUnits()

  if (scope.restricted) {
    if (!units) return <p className="text-muted-foreground text-sm">{copy.grid.loading}</p>
    const own = units.find((unit) => unit.id === scope.unitId)
    if (own) return <Navigate to={`/camas/${own.code}`} replace />
    return <NoUnit />
  }
  if (session.status !== 'authenticated') return null
  return <Census userId={session.user.id} />
}

function NoUnit() {
  return (
    <>
      <PageHeader title={copy.title} />
      <EmptyState
        icon={BedDouble}
        title={copy.noUnit.title}
        description={copy.noUnit.description}
      />
    </>
  )
}

function Census({ userId }: { userId: string }) {
  const [filters, setFilters] = useBedFilters(userId)
  const specialties = useSpecialties()
  const allUnits = useUnits()
  const selectUnits = useCallback(
    (units: readonly Unit[]) => applyFilters(units, filters),
    [filters],
  )
  const data = useCensus(selectUnits)
  const options = useMemo(
    () => filterOptions(allUnits ?? [], specialties ?? []),
    [allUnits, specialties],
  )
  const exceptions = useMemo(() => (data ? censusExceptions(data.census, data.now) : []), [data])

  const empty = data && data.census.units.length === 0 && !hasActiveFilters(filters)

  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      {!data ? (
        <p className="text-muted-foreground text-sm" aria-busy="true">
          {copy.grid.loading}
        </p>
      ) : empty ? (
        <EmptyState icon={BedDouble} title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : (
        <>
          <BedFilters filters={filters} options={options} onChange={setFilters} />
          <CensusKpis kpis={data.census.hospital} />
          <CensusExceptions exceptions={exceptions} />
          <UnitGrid units={data.census.units} />
        </>
      )}
    </>
  )
}
