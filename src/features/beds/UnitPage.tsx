import { ArrowLeft, BedDouble } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { useSpecialties, useUnits } from '@/data/hooks'
import type { Unit } from '@/domain/schemas'
import { useUnitScope } from '@/features/auth/useUnitScope'
import { es } from '@/i18n/es'
import { BED_STATUS_ACTIONS } from '@/domain/access'
import { BedActionSheet, type BedSheetCommand } from './components/BedActionSheet'
import { BedLegend } from './components/BedLegend'
import { BedMap } from './components/BedMap'
import { CensusKpis } from './components/CensusKpis'
import { useBedActions } from './useBedActions'
import { useCensus } from './useCensus'
import { useBedIdSet } from './useBedIdSet'
import { useTurnaround } from './useTurnaround'

const copy = es.pages.beds

/** `/camas/:unitCode`: KPIs and bed map of one unit. Nurse supervisors only ever see their own. */
export default function UnitPage() {
  const { unitCode = '' } = useParams()
  const units = useUnits()
  const scope = useUnitScope()

  if (!units) return <p className="text-muted-foreground text-sm">{copy.unit.loading}</p>

  // Fails closed: a supervisor only ever sees their own unit, and nothing without one.
  if (scope.restricted) {
    const own = units.find((unit) => unit.id === scope.unitId)
    if (!own) {
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
    if (own.code !== unitCode) return <Navigate to={`/camas/${own.code}`} replace />
  }

  const unit = units.find((candidate) => candidate.code === unitCode)
  if (!unit) {
    return (
      <>
        <PageHeader title={copy.unit.notFoundTitle} />
        <EmptyState
          icon={BedDouble}
          title={copy.unit.notFoundTitle}
          description={copy.unit.notFoundDescription(unitCode)}
        >
          <Button asChild variant="outline" size="sm">
            <Link to="/camas">{copy.unit.back}</Link>
          </Button>
        </EmptyState>
      </>
    )
  }
  return <UnitView unit={unit} scoped={scope.restricted} />
}

function UnitView({ unit, scoped }: { unit: Unit; scoped: boolean }) {
  const specialties = useSpecialties()
  const selectUnit = useCallback(() => [unit], [unit])
  const data = useCensus(selectUnit)
  const actions = useBedActions()
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)
  const selectBed = useCallback((bedId: string) => {
    returnFocusTo.current = document.activeElement as HTMLElement | null
    setSelectedBedId(bedId)
  }, [])
  const specialtyNames = useMemo(
    () => new Map((specialties ?? []).map((s) => [s.code, s.name])),
    [specialties],
  )

  const names = unit.specialtyCodes
    .map((code) => specialties?.find((s) => s.code === code)?.name ?? code)
    .join(', ')
  const description = [
    copy.unit.header(unit.building, unit.floor, copy.unitTypes[unit.type]),
    names && copy.unit.services(names),
  ]
    .filter(Boolean)
    .join(' — ')

  const unitCensus = data?.census.units[0]
  const bedIds = useBedIdSet(unitCensus?.beds.map((v) => v.bed.id) ?? [])
  const turnaround = useTurnaround(bedIds)

  // The sheet follows live data: it shows the bed's current status and the actions that fit it.
  const selected = unitCensus?.beds.find((v) => v.bed.id === selectedBedId) ?? null
  const allowed = selected
    ? BED_STATUS_ACTIONS[selected.bed.status].filter((action) => actions.canAct(action, unit.id))
    : []
  const perform = (command: BedSheetCommand) => {
    const bed = selected!.bed
    const base = { bedId: bed.id, bedLabel: bed.label }
    switch (command.action) {
      case 'block':
        return actions.perform({ ...base, action: 'block', reason: command.reason })
      case 'release':
        return actions.perform({
          ...base,
          action: 'release',
          ...(command.reason ? { reason: command.reason } : {}),
          ...(bed.admissionId ? { expectedAdmissionId: bed.admissionId } : {}),
        })
      default:
        return actions.perform({ ...base, action: command.action })
    }
  }

  return (
    <>
      <PageHeader
        title={unit.name}
        description={description}
        actions={
          scoped ? undefined : (
            <Button asChild variant="outline" size="sm">
              <Link to="/camas">
                <ArrowLeft aria-hidden="true" />
                {copy.unit.back}
              </Link>
            </Button>
          )
        }
      />
      {!data ? (
        <p className="text-muted-foreground text-sm" aria-busy="true">
          {copy.unit.loading}
        </p>
      ) : !unitCensus ? (
        <EmptyState icon={BedDouble} title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : (
        <>
          <CensusKpis kpis={unitCensus.kpis} turnaround={turnaround} />
          <BedLegend />
          <BedMap
            views={unitCensus.beds}
            now={data.now}
            specialtyNames={specialtyNames}
            onSelect={selectBed}
          />
          <BedActionSheet
            view={selected}
            now={data.now}
            allowed={allowed}
            busy={actions.busy}
            onPerform={perform}
            onClose={() => setSelectedBedId(null)}
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              returnFocusTo.current?.focus()
            }}
          />
        </>
      )}
    </>
  )
}
