import { KpiStrip, KpiTile } from '@/components/dashboard'
import {
  slaStatus,
  TRANSFER_THRESHOLDS,
  unassignedStatus,
  type TransferKpis as Kpis,
} from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration } from '@/lib/format'

const copy = es.pages.transfers.kpis

/** The six Traslados tiles. Presentational. */
export function TransferKpis({ kpis }: { kpis: Kpis }) {
  return (
    <KpiStrip label={copy.label}>
      <KpiTile
        label={copy.open.label}
        value={kpis.open}
        context={copy.open.context(kpis.requested, kpis.assigned, kpis.pickedUp)}
      />
      <KpiTile
        label={copy.unassigned.label}
        value={kpis.requested}
        context={
          kpis.oldestUnassignedMs === null
            ? copy.unassigned.none
            : copy.unassigned.context(formatDuration(kpis.oldestUnassignedMs))
        }
        status={unassignedStatus(kpis.oldestUnassignedMs)}
      />
      <KpiTile
        label={copy.pickup.label}
        value={kpis.medianPickupMs === null ? '—' : formatDuration(kpis.medianPickupMs)}
        context={
          kpis.medianPickupMs === null ? copy.pickup.none : copy.pickup.context(kpis.pickedUpToday)
        }
      />
      <KpiTile
        label={copy.sla.label}
        value={kpis.withinSlaPct === null ? '—' : Math.round(kpis.withinSlaPct * 100)}
        {...(kpis.withinSlaPct === null ? {} : { unit: '%' })}
        context={
          kpis.withinSlaPct === null
            ? copy.sla.none
            : copy.sla.context(kpis.withinSlaToday, kpis.pickedUpToday)
        }
        target={copy.sla.target(Math.round(TRANSFER_THRESHOLDS.slaObjective * 100))}
        status={slaStatus(kpis.withinSlaPct)}
      />
      <KpiTile
        label={copy.porters.label}
        value={kpis.portersAvailable}
        context={copy.porters.context(kpis.portersBusy, kpis.portersOff)}
      />
      <KpiTile label={copy.done.label} value={kpis.deliveredToday} context={copy.done.context} />
    </KpiStrip>
  )
}
