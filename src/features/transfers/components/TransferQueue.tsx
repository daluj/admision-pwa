import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { QueueRow } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { SlaText } from './SlaText'

const copy = es.pages.transfers.queue
const labels = es.pages.settings.eventLog.details

type TransferQueueProps = {
  rows: readonly QueueRow[]
  canCreate: boolean
  canAssign: boolean
  canCancel: boolean
  onNew: () => void
  onAssign: (row: QueueRow) => void
  onCancel: (row: QueueRow) => void
}

/** Open transfers, urgent first. Presentational. */
export function TransferQueue({
  rows,
  canCreate,
  canAssign,
  canCancel,
  onNew,
  onAssign,
  onCancel,
}: TransferQueueProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
        {canCreate && (
          <div className="mt-2">
            <Button size="sm" onClick={onNew}>
              {copy.newTransfer}
            </Button>
          </div>
        )}
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
                  {(
                    [
                      'priority',
                      'patient',
                      'route',
                      'reason',
                      'status',
                      'sla',
                      'porter',
                      'actions',
                    ] as const
                  ).map((key) => (
                    <th key={key} scope="col" className="py-2 pr-3 font-medium">
                      {copy.columns[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => {
                  const label = `${row.initials} → ${row.toLabel}`
                  return (
                    <tr
                      key={row.transfer.id}
                      data-transfer={row.transfer.id}
                      data-status={row.status}
                    >
                      <td className="py-2 pr-3 font-medium whitespace-nowrap">
                        {labels.transferPriorities[row.priority]}
                      </td>
                      <td className="py-2 pr-3 font-medium tabular-nums">{row.initials}</td>
                      <td className="py-2 pr-3">
                        {row.fromLabel} → {row.toLabel}
                      </td>
                      <td className="py-2 pr-3">{labels.transferReasons[row.transfer.reason]}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {copy.statuses[row.status as keyof typeof copy.statuses]}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <SlaText row={row} />
                      </td>
                      <td className="py-2 pr-3">
                        {row.porter ? (
                          row.porter.name
                        ) : (
                          <span className="text-muted-foreground">{copy.noPorter}</span>
                        )}
                      </td>
                      <td className="py-2 whitespace-nowrap">
                        {canAssign || canCancel ? (
                          <span className="flex gap-2">
                            {canAssign && row.status === 'REQUESTED' && (
                              <Button
                                size="sm"
                                onClick={() => onAssign(row)}
                                aria-label={`${copy.assign}: ${label}`}
                              >
                                {copy.assign}
                              </Button>
                            )}
                            {canCancel &&
                              row.status !== 'PICKED_UP' &&
                              row.transfer.reason !== 'ADMISSION' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onCancel(row)}
                                  aria-label={`${copy.cancel}: ${label}`}
                                >
                                  {copy.cancel}
                                </Button>
                              )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">{copy.readOnly}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
