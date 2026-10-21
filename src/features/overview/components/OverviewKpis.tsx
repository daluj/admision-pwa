import { KpiStrip, KpiTile } from '@/components/dashboard'
import type { Overview } from '@/domain/alerts'
import { es } from '@/i18n/es'
import { formatDuration } from '@/lib/format'

const beds = es.pages.overview.beds
const flow = es.pages.overview.flow

/** The headline numbers of every area, each linking to its dashboard. Presentational. */
export function OverviewKpis({
  overview,
  alerts,
}: {
  overview: Overview
  alerts: { unacknowledged: number; open: number }
}) {
  const { census, ed, admissions, balance, transfers, tiles } = overview
  return (
    <>
      <KpiStrip label={beds.label} size={4}>
        <KpiTile
          label={beds.occupancy.label}
          value={Math.round(census.occupancy * 100)}
          unit="%"
          context={beds.occupancy.context(census.counts.OCCUPIED, census.counts.operational)}
          status={tiles.occupancy}
          href="/camas"
        />
        <KpiTile
          label={beds.free.label}
          value={census.counts.AVAILABLE}
          context={beds.free.context(census.counts.RESERVED, census.counts.PENDING_CLEANING)}
          href="/camas"
        />
        <KpiTile
          label={beds.flow.label}
          value={`${admissions.admittedToday} / ${admissions.dischargedToday}`}
          context={beds.flow.context(admissions.expectedToday)}
          href="/ingresos-altas"
        />
        <KpiTile
          label={beds.balance.label}
          value={balance.value}
          context={beds.balance.context}
          status={tiles.balance}
          href="/ingresos-altas"
        />
      </KpiStrip>
      <KpiStrip label={flow.label} size={5}>
        <KpiTile
          label={flow.ed.label}
          value={ed.present}
          context={flow.ed.context(ed.waitingPhysician)}
          href="/urgencias"
        />
        <KpiTile
          label={flow.boarding.label}
          value={ed.boarding}
          context={
            ed.longestBoardingMs === null
              ? flow.boarding.none
              : flow.boarding.context(formatDuration(ed.longestBoardingMs))
          }
          status={tiles.boarding}
          href="/urgencias"
        />
        <KpiTile
          label={flow.transfers.label}
          value={transfers.open}
          context={flow.transfers.context(transfers.requested)}
          href="/traslados"
        />
        <KpiTile
          label={flow.sla.label}
          value={transfers.withinSlaPct === null ? '—' : Math.round(transfers.withinSlaPct * 100)}
          {...(transfers.withinSlaPct === null ? {} : { unit: '%' })}
          context={
            transfers.withinSlaPct === null
              ? flow.sla.none
              : flow.sla.context(transfers.withinSlaToday, transfers.pickedUpToday)
          }
          status={tiles.sla}
          href="/traslados"
        />
        <KpiTile
          label={flow.alerts.label}
          value={alerts.unacknowledged}
          context={flow.alerts.context(alerts.open)}
          status={alerts.unacknowledged > 0 ? 'warn' : 'ok'}
        />
      </KpiStrip>
    </>
  )
}
