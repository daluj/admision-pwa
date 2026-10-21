import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ScheduledRow, ScheduleStatus } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { localTimeOf } from '../expectedTime'

const copy = es.pages.admissions.scheduled

const STATUS_STYLES: Record<ScheduleStatus, string> = {
  PENDING: 'bg-secondary text-secondary-foreground',
  ARRIVED: 'bg-status-warn text-status-warn-foreground',
  BED_RESERVED: 'bg-status-info text-status-info-foreground',
  ADMITTED: 'bg-status-ok text-status-ok-foreground',
  CANCELLED: 'bg-status-neutral text-status-neutral-foreground',
}

type ScheduledTableProps = { rows: readonly ScheduledRow[] }

/** The day's scheduled admissions with their state. Presentational. */
export function ScheduledTable({ rows }: ScheduledTableProps) {
  const count = (...statuses: ScheduleStatus[]) =>
    rows.filter((r) => statuses.includes(r.status)).length
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription aria-live="polite">
          {copy.counts(
            count('PENDING'),
            count('ARRIVED', 'BED_RESERVED'),
            count('ADMITTED'),
            count('CANCELLED'),
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{copy.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{copy.title}</caption>
              <thead className="text-muted-foreground border-b text-xs">
                <tr>
                  {(['time', 'patient', 'service', 'status'] as const).map((key) => (
                    <th key={key} scope="col" className="py-2 pr-3 font-medium">
                      {copy.columns[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr
                    key={row.admission.id}
                    data-admission={row.admission.id}
                    data-status={row.status}
                  >
                    <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                      {localTimeOf(row.scheduledFor)}
                    </td>
                    <td className="py-2 pr-3 font-medium tabular-nums">{row.initials}</td>
                    <td className="py-2 pr-3">{row.specialtyName}</td>
                    <td className="py-2">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_STYLES[row.status],
                        )}
                      >
                        {copy.status[row.status]}
                        {row.status === 'CANCELLED' &&
                          row.cancelReason &&
                          ` · ${copy.cancelReasons[row.cancelReason]}`}
                      </span>
                      {(row.status === 'ARRIVED' || row.status === 'BED_RESERVED') &&
                        row.sinceMs > 0 && (
                          <span className="text-muted-foreground ml-2 text-xs tabular-nums">
                            +{formatDuration(row.sinceMs)}
                          </span>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
