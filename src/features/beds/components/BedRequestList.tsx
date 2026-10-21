import { Wind } from 'lucide-react'
import { DurationText } from '@/components/dashboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CENSUS_THRESHOLDS, type OpenRequestRow } from '@/domain/kpis'
import type { BedRequestPriority } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'

const copy = es.pages.beds.requests

const PRIORITY_STYLES: Record<BedRequestPriority, string> = {
  P1: 'bg-status-critical text-status-critical-foreground',
  P2: 'bg-status-warn text-status-warn-foreground',
  P3: 'bg-status-info text-status-info-foreground',
}

const WAIT_TARGET = {
  warnMs: CENSUS_THRESHOLDS.requestWaitWarnMin * 60_000,
  criticalMs: CENSUS_THRESHOLDS.requestWaitCriticalMin * 60_000,
}

type BedRequestListProps = {
  rows: readonly OpenRequestRow[]
  assignedCount: number
  now: string
  /** Shows the "Asignar cama" buttons (read-only roles get none). */
  canAssign: boolean
  onAssign: (row: OpenRequestRow) => void
}

/** Open bed requests, most urgent first. Presentational. */
export function BedRequestList({
  rows,
  assignedCount,
  now,
  canAssign,
  onAssign,
}: BedRequestListProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">{copy.title}</CardTitle>
        <CardDescription aria-live="polite">
          {copy.counts(rows.length, assignedCount)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{copy.empty}</p>
        ) : (
          <ul aria-label={copy.list} className="divide-y">
            {rows.map((row) => {
              const { request } = row
              const unitType = es.pages.beds.unitTypes[request.requiredUnitType]
              return (
                <li
                  key={request.id}
                  data-priority={request.priority}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2"
                >
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      PRIORITY_STYLES[request.priority],
                    )}
                  >
                    <span className="sr-only">{copy.priority(request.priority)}: </span>
                    {request.priority}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium tabular-nums">{row.initials ?? '—'}</p>
                    <p className="text-muted-foreground text-xs">
                      {row.source.kind === 'ED'
                        ? copy.sourceEd(row.source.triageLevel)
                        : copy.sourceScheduled}
                      {' · '}
                      {row.specialtyName}
                      {' · '}
                      {unitType}
                      {request.isolationRequired && (
                        <span className="text-status-info ml-2 inline-flex items-center gap-0.5 font-medium">
                          <Wind className="size-3" aria-hidden="true" />
                          {copy.isolation}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground mr-1 text-xs">{copy.waiting}</span>
                    <DurationText from={request.requestedAt} now={now} target={WAIT_TARGET} />
                  </p>
                  {canAssign && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAssign(row)}
                      aria-label={copy.assignFor(row.initials ?? '')}
                    >
                      {copy.assign}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
