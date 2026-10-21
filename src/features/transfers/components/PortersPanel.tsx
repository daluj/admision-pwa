import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PorterRow } from '@/domain/kpis'
import { es } from '@/i18n/es'

const copy = es.pages.transfers.portersPanel

export function PortersPanel({ rows, offShift }: { rows: readonly PorterRow[]; offShift: number }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{copy.empty}</p>
        ) : (
          <ul aria-label={copy.title} className="divide-y text-sm">
            {rows.map(({ porter, job }) => (
              <li
                key={porter.id}
                data-porter={porter.id}
                data-status={porter.status}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="font-medium">{porter.name}</span>
                <span className="text-muted-foreground">
                  {job ? copy.job(job.initials, job.toLabel) : copy.idle}
                </span>
                <span
                  className={
                    porter.status === 'AVAILABLE'
                      ? 'text-status-ok font-medium'
                      : 'text-status-warn font-medium'
                  }
                >
                  {porter.status === 'AVAILABLE' ? copy.available : copy.busy}
                </span>
              </li>
            ))}
          </ul>
        )}
        {offShift > 0 && (
          <p className="text-muted-foreground mt-2 text-xs">{copy.offShift(offShift)}</p>
        )}
      </CardContent>
    </Card>
  )
}
