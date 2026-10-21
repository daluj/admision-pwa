import { memo } from 'react'
import { Shuffle } from 'lucide-react'
import { DurationText, StatusBadge } from '@/components/dashboard'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { BedView } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDateTime } from '@/lib/time'
import { formatDuration, formatRelativeDay } from '@/lib/format'
import { cn } from '@/lib/utils'

const copy = es.pages.beds.unit

type BedTileProps = {
  view: BedView
  now: string
  /** Full specialty name for the detail (falls back to the code). */
  specialtyName?: string | undefined
  /** Opens the bed's action sheet. */
  onSelect?: ((bedId: string) => void) | undefined
}

function dischargeText(view: BedView, now: string): string {
  if (view.dischargeOrdered) return copy.discharge.ordered
  return view.expectedDischargeAt
    ? copy.discharge.expected(formatRelativeDay(view.expectedDischargeAt, now))
    : copy.discharge.none
}

/**
 * One bed. The face shows status (colour + icon + text) and patient initials only; the full
 * name and NHC live in the tooltip, which opens on hover and on keyboard focus.
 */
export const BedTile = memo(function BedTile({ view, now, specialtyName, onSelect }: BedTileProps) {
  const { bed, patient } = view
  const occupied = bed.status === 'OCCUPIED'
  const waiting = bed.status === 'PENDING_CLEANING' || bed.status === 'CLEANING'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onSelect?.(bed.id)}
          data-status={bed.status}
          data-outlier={view.outlier || undefined}
          className={cn(
            'bg-card focus-visible:ring-ring flex min-h-28 w-full flex-col items-stretch gap-1 rounded-md border p-2 text-left text-xs focus-visible:ring-2 focus-visible:outline-none',
            view.outlier && 'border-dashed border-status-info',
          )}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-semibold tabular-nums">{bed.label}</span>
            {view.outlier && (
              <span className="text-status-info inline-flex items-center gap-0.5 font-medium">
                <Shuffle className="size-3" aria-hidden="true" />
                {copy.outlier}
              </span>
            )}
          </div>
          <StatusBadge kind="bed" status={bed.status} className="self-start" />
          {patient && (occupied || bed.status === 'RESERVED') && (
            <p className="font-medium tabular-nums">{patient.initials}</p>
          )}
          {occupied && view.losMs !== undefined && (
            <p className="text-muted-foreground tabular-nums">
              {copy.stay(formatDuration(view.losMs))}
            </p>
          )}
          {occupied && <p className="text-muted-foreground">{dischargeText(view, now)}</p>}
          {bed.status === 'BLOCKED' && bed.blockedReason && (
            <p className="text-muted-foreground">{bed.blockedReason}</p>
          )}
          {(waiting || bed.status === 'BLOCKED') && (
            <p className="text-muted-foreground">
              {copy.since} <DurationText from={bed.statusChangedAt} now={now} />
            </p>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <p className="font-semibold">{bed.label}</p>
        {patient ? (
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
            <dt>{copy.detail.patient}</dt>
            <dd>{patient.fullName}</dd>
            <dt>{copy.detail.mrn}</dt>
            <dd className="tabular-nums">{patient.mrn}</dd>
            {view.admittedAt && (
              <>
                <dt>{copy.detail.admittedAt}</dt>
                <dd className="tabular-nums">{formatDateTime(view.admittedAt)}</dd>
              </>
            )}
            {view.specialtyCode && (
              <>
                <dt>{copy.detail.specialty}</dt>
                <dd>{specialtyName ?? view.specialtyCode}</dd>
              </>
            )}
          </dl>
        ) : (
          <p>{es.pages.beds.status[bed.status]}</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
})
