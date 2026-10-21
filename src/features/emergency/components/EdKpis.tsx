import { KpiStrip, KpiTile } from '@/components/dashboard'
import {
  boardingCountStatus,
  boardingLongStatus,
  ED_THRESHOLDS,
  physicianWaitStatus,
  triageWaitStatus,
  withinTargetStatus,
  type EdKpis as Kpis,
} from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration } from '@/lib/format'

const copy = es.pages.emergency.kpis

/** The six Urgencias tiles. Presentational. */
export function EdKpis({ kpis }: { kpis: Kpis }) {
  return (
    <KpiStrip label={copy.label}>
      <KpiTile
        label={copy.present.label}
        value={kpis.present}
        context={copy.present.context(kpis.inBoxes, kpis.inWaitingRoom)}
      />
      <KpiTile
        label={copy.waitingTriage.label}
        value={kpis.waitingTriage}
        context={copy.waitingTriage.context(
          kpis.oldestTriageWaitMs === null ? null : formatDuration(kpis.oldestTriageWaitMs),
        )}
        status={triageWaitStatus(kpis.oldestTriageWaitMs)}
      />
      <KpiTile
        label={copy.waitingPhysician.label}
        value={kpis.waitingPhysician}
        context={copy.waitingPhysician.context(kpis.overTarget)}
        status={physicianWaitStatus(kpis)}
      />
      <KpiTile
        label={copy.boarding.label}
        value={kpis.boarding}
        context={copy.boarding.context(kpis.boardingWithBed)}
        status={boardingCountStatus(kpis.boarding)}
      />
      <KpiTile
        label={copy.longestBoarding.label}
        value={kpis.longestBoardingMs === null ? '—' : formatDuration(kpis.longestBoardingMs)}
        context={copy.longestBoarding.context(kpis.boardingOverFourHours)}
        status={boardingLongStatus(kpis.longestBoardingMs)}
      />
      <KpiTile
        label={copy.withinTarget.label}
        value={kpis.withinPct === null ? '—' : Math.round(kpis.withinPct * 100)}
        {...(kpis.withinPct === null ? {} : { unit: '%' })}
        context={
          kpis.withinPct === null
            ? copy.withinTarget.none
            : copy.withinTarget.context(kpis.within24h, kpis.seen24h)
        }
        target={copy.withinTarget.target(Math.round(ED_THRESHOLDS.withinTargetObjective * 100))}
        status={withinTargetStatus(kpis.withinPct)}
      />
    </KpiStrip>
  )
}
