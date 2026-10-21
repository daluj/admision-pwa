import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PorterView, QueueRow } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { useTransferActions } from '../useTransferActions'
import { SlaText } from './SlaText'

const copy = es.pages.transfers.myQueue
const details = es.pages.settings.eventLog.details

function Route({ row }: { row: QueueRow }) {
  return (
    <div>
      <p className="font-medium">
        {row.initials} · {row.fromLabel} → {row.toLabel}
      </p>
      <p className="text-muted-foreground text-xs">
        {details.transferPriorities[row.priority]} · {details.transferReasons[row.transfer.reason]}{' '}
        · <SlaText row={row} />
      </p>
    </div>
  )
}

/** "Mi cola": a porter's own work with the next step, and the open queue to accept from. */
export function MyQueue({ view }: { view: PorterView }) {
  const actions = useTransferActions()
  const busyNow = view.porter.status !== 'AVAILABLE'

  return (
    <>
      <p className="mb-4 text-sm">
        {copy.status(
          view.porter.name,
          view.porter.status === 'AVAILABLE'
            ? es.pages.transfers.portersPanel.available
            : es.pages.transfers.portersPanel.busy,
        )}
        {' · '}
        <span>{copy.doneToday(view.deliveredToday)}</span>
      </p>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">
            <h2>{copy.work}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {view.work.length === 0 ? (
            <p className="text-muted-foreground text-sm">{copy.workEmpty}</p>
          ) : (
            <ul aria-label={copy.work} className="divide-y">
              {view.work.map((row) => {
                const next = row.status === 'ASSIGNED' ? 'pickUp' : 'deliver'
                return (
                  <li
                    key={row.transfer.id}
                    data-transfer={row.transfer.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <Route row={row} />
                    <Button
                      onClick={() =>
                        actions.perform({
                          action: next,
                          transferId: row.transfer.id,
                          label: `${row.initials} → ${row.toLabel}`,
                        })
                      }
                      disabled={actions.busy}
                      aria-label={`${copy[next]}: ${row.initials} → ${row.toLabel}`}
                    >
                      {copy[next]}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">
            <h2>{copy.open}</h2>
          </CardTitle>
          {busyNow && view.openQueue.length > 0 && (
            <p className="text-muted-foreground text-sm">{copy.busyNote}</p>
          )}
        </CardHeader>
        <CardContent>
          {view.openQueue.length === 0 ? (
            <p className="text-muted-foreground text-sm">{copy.openEmpty}</p>
          ) : (
            <ul aria-label={copy.open} className="divide-y">
              {view.openQueue.map((row) => (
                <li
                  key={row.transfer.id}
                  data-transfer={row.transfer.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <Route row={row} />
                  <Button
                    variant="outline"
                    disabled={busyNow || actions.busy}
                    onClick={() =>
                      actions.perform({
                        action: 'accept',
                        transferId: row.transfer.id,
                        label: `${row.initials} → ${row.toLabel}`,
                      })
                    }
                    aria-label={`${copy.accept}: ${row.initials} → ${row.toLabel}`}
                  >
                    {copy.accept}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
