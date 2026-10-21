import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HospitalStatus, StatusReason } from '@/domain/alerts'
import { StatusLevel } from '@/features/alerts/StatusLevelBadge'
import { es } from '@/i18n/es'

const copy = es.pages.overview.status
const reasons = es.alerts.status

function reasonText(reason: StatusReason): string {
  switch (reason.kind) {
    case 'occupancy':
      return reasons.occupancy(Math.round(reason.value * 100))
    case 'boardingCount':
      return reasons.boardingCount(reason.value)
    case 'boardingLong':
      return reasons.boardingLong(reason.value.toFixed(1).replace('.', ','))
  }
}

/** The hospital status level, in words, with what triggered it. */
export function StatusCard({ status }: { status: HospitalStatus }) {
  return (
    <Card className="mb-6" data-level={status.level}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3 text-base">
          <h2>{copy.title}</h2>
          <StatusLevel level={status.level} className="px-3 py-1 text-sm" />
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <p className="font-medium">{copy.levels[status.level]}</p>
        {status.reasons.length === 0 ? (
          <p className="text-muted-foreground">{reasons.none}</p>
        ) : (
          <ul aria-label={copy.title} className="text-muted-foreground mt-1 list-disc pl-5">
            {status.reasons.map((reason) => (
              <li key={reason.kind} data-reason={reason.kind} data-level={reason.level}>
                {reasonText(reason)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
