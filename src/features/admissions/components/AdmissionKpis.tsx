import { KpiStrip, KpiTile } from '@/components/dashboard'
import {
  ADMISSION_THRESHOLDS,
  balanceStatus,
  beforeNoonStatus,
  cancelledNoBedStatus,
  type AdmissionsKpis,
  type BalanceForecast,
} from '@/domain/kpis'
import { es } from '@/i18n/es'

const copy = es.pages.admissions.kpis

/** The six Ingresos y altas tiles. Presentational. */
export function AdmissionKpis({
  kpis,
  balance,
}: {
  kpis: AdmissionsKpis
  balance: BalanceForecast
}) {
  return (
    <KpiStrip label={copy.label}>
      <KpiTile
        label={copy.admittedToday.label}
        value={kpis.admittedToday}
        context={copy.admittedToday.context(kpis.admittedUrgent, kpis.admittedScheduled)}
      />
      <KpiTile
        label={copy.scheduledPending.label}
        value={kpis.scheduledPending}
        context={copy.scheduledPending.context(kpis.scheduledArrived)}
      />
      <KpiTile
        label={copy.discharged.label}
        value={kpis.dischargedToday}
        context={copy.discharged.context(kpis.expectedToday)}
      />
      <KpiTile
        label={copy.beforeNoon.label}
        value={kpis.pctBeforeNoon === null ? '—' : Math.round(kpis.pctBeforeNoon * 100)}
        {...(kpis.pctBeforeNoon === null ? {} : { unit: '%' })}
        context={
          kpis.pctBeforeNoon === null
            ? copy.beforeNoon.none
            : copy.beforeNoon.context(kpis.dischargedBeforeNoon, kpis.dischargedToday)
        }
        target={copy.beforeNoon.target(Math.round(ADMISSION_THRESHOLDS.beforeNoonObjective * 100))}
        status={beforeNoonStatus(kpis.pctBeforeNoon)}
      />
      <KpiTile
        label={copy.balance.label}
        value={balance.value}
        context={copy.balance.context}
        status={balanceStatus(balance.value)}
      />
      <KpiTile
        label={copy.cancelledNoBed.label}
        value={kpis.cancelledNoBed}
        context={copy.cancelledNoBed.context}
        status={cancelledNoBedStatus(kpis.cancelledNoBed)}
      />
    </KpiStrip>
  )
}
