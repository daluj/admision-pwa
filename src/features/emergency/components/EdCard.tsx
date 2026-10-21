import { MapPin } from 'lucide-react'
import { DurationText, TriageBadge } from '@/components/dashboard'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ED_THRESHOLDS, type BoardPhase, type EdCard as Card } from '@/domain/kpis'
import { es } from '@/i18n/es'

const copy = es.pages.emergency.board
const MINUTE = 60_000

/** Amber/red thresholds for the time in a phase (the Manchester target for triaged patients). */
function waitTarget(
  card: Card,
  phase: BoardPhase,
): { warnMs: number; criticalMs: number } | undefined {
  switch (phase) {
    case 'ARRIVED':
      // Strictly past the limit, like the KPI tile.
      return {
        warnMs: ED_THRESHOLDS.triageWaitWarnMin * MINUTE + 1,
        criticalMs: ED_THRESHOLDS.triageWaitCriticalMin * MINUTE + 1,
      }
    case 'TRIAGED': {
      if (card.targetMs === undefined) return undefined
      // Strictly over the target is late (a patient exactly at target is not); 1.5× is critical.
      return {
        warnMs: card.targetMs + 1,
        criticalMs: Math.round(card.targetMs * ED_THRESHOLDS.targetCriticalFactor) + 1,
      }
    }
    case 'ADMIT_DECISION':
      return {
        warnMs: ED_THRESHOLDS.boardingLongWarnMin * MINUTE + 1,
        criticalMs: ED_THRESHOLDS.boardingLongCriticalMin * MINUTE + 1,
      }
    default:
      return undefined
  }
}

type EdCardProps = { card: Card; phase: BoardPhase; now: string }

/**
 * One ED patient. The face shows triage (colour + number), initials, complaint, area and the time
 * in the phase; the full name and NHC live in the tooltip (hover and keyboard focus).
 */
export function EdCard({ card, phase, now }: EdCardProps) {
  const target = waitTarget(card, phase)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-visit={card.visit.id}
          data-over-target={card.overTarget || undefined}
          className="bg-card focus-visible:ring-ring flex w-full flex-col gap-1 rounded-md border p-2 text-left text-xs focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="flex items-center gap-2">
            {card.level ? (
              <TriageBadge level={card.level} />
            ) : (
              <span className="text-muted-foreground text-xs">{copy.noTriage}</span>
            )}
            <span className="text-sm font-semibold tabular-nums">{card.initials}</span>
          </span>
          <span className="text-muted-foreground">{card.chiefComplaint}</span>
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <MapPin className="size-3" aria-hidden="true" />
            {copy.areas[card.area]}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2">
            <DurationText from={card.since} now={now} {...(target ? { target } : {})} />
            {card.targetMs !== undefined && (
              <span className="text-muted-foreground">{copy.target(card.targetMs / MINUTE)}</span>
            )}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
          <dt>{copy.detail.patient}</dt>
          <dd>{card.fullName || card.initials}</dd>
          <dt>{copy.detail.mrn}</dt>
          <dd className="tabular-nums">{card.mrn}</dd>
          <dt>{copy.detail.complaint}</dt>
          <dd>{card.chiefComplaint}</dd>
          <dt>{copy.detail.area}</dt>
          <dd>{copy.areas[card.area]}</dd>
        </dl>
      </TooltipContent>
    </Tooltip>
  )
}
