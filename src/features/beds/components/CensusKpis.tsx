import { KpiStrip, KpiTile } from '@/components/dashboard'
import {
  CENSUS_THRESHOLDS,
  freeBedsStatus,
  occupancyStatus,
  outliersStatus,
  pendingCleaningStatus,
  turnaroundStatus,
  type CensusKpis as Kpis,
  type Turnaround,
} from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration } from '@/lib/format'

const copy = es.pages.beds.kpis

const percent = (share: number) => Math.round(share * 100)

/** The six census tiles for a set of beds (the hospital, a filtered view or one unit). */
export function CensusKpis({
  kpis,
  turnaround,
}: {
  kpis: Kpis
  turnaround?: Turnaround | undefined
}) {
  const { counts } = kpis
  return (
    <KpiStrip label={copy.label} size={7}>
      <KpiTile
        label={copy.occupancy.label}
        value={percent(kpis.occupancy)}
        unit="%"
        context={copy.occupancy.context(counts.OCCUPIED, counts.operational)}
        target={copy.occupancy.target(percent(CENSUS_THRESHOLDS.occupancyWarn))}
        status={occupancyStatus(kpis.occupancy)}
      />
      <KpiTile
        label={copy.free.label}
        value={counts.AVAILABLE}
        context={copy.free.context(counts.RESERVED)}
        status={freeBedsStatus(kpis)}
      />
      <KpiTile
        label={copy.pendingCleaning.label}
        value={counts.PENDING_CLEANING}
        context={copy.pendingCleaning.context(counts.CLEANING)}
        status={pendingCleaningStatus(kpis)}
      />
      <KpiTile
        label={copy.blocked.label}
        value={counts.BLOCKED}
        context={copy.blocked.context(
          counts.total === 0 ? 0 : percent(counts.BLOCKED / counts.total),
        )}
      />
      <KpiTile
        label={copy.expectedDischarges.label}
        value={kpis.expectedToday}
        context={copy.expectedDischarges.context(kpis.dischargedToday)}
      />
      <KpiTile
        label={copy.turnaround.label}
        value={turnaround?.medianMs != null ? formatDuration(turnaround.medianMs) : '—'}
        context={
          turnaround && turnaround.count > 0
            ? copy.turnaround.context(turnaround.count)
            : copy.turnaround.none
        }
        target={copy.turnaround.target(CENSUS_THRESHOLDS.turnaroundWarnMin)}
        status={turnaroundStatus(turnaround?.medianMs ?? null)}
      />
      <KpiTile
        label={copy.outliers.label}
        value={kpis.outliers}
        context={copy.outliers.context(kpis.outlierUnits)}
        status={outliersStatus(kpis)}
      />
    </KpiStrip>
  )
}
