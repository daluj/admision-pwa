import { OctagonAlert, TriangleAlert } from 'lucide-react'
import type { QueueRow } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

const copy = es.pages.transfers.queue

/** Time left (or overdue) to pick the patient up; late ones carry an icon and text, not only colour. */
export function SlaText({
  row,
}: {
  row: Pick<QueueRow, 'status' | 'slaMs' | 'overdue' | 'priority'>
}) {
  if (row.status === 'PICKED_UP')
    return <span className="text-muted-foreground">{copy.slaDone}</span>
  const critical = row.overdue && row.priority === 'URGENT'
  return (
    <span
      data-overdue={row.overdue}
      className={cn(
        'tabular-nums',
        row.overdue &&
          !critical &&
          'bg-status-warn text-status-warn-foreground rounded px-1 font-medium',
        critical && 'text-status-critical font-semibold',
      )}
    >
      {row.overdue &&
        (critical ? (
          <OctagonAlert className="mr-0.5 inline size-3" aria-hidden="true" />
        ) : (
          <TriangleAlert className="mr-0.5 inline size-3" aria-hidden="true" />
        ))}
      {row.overdue
        ? copy.slaLate(formatDuration(-row.slaMs))
        : copy.slaIn(formatDuration(row.slaMs))}
    </span>
  )
}
