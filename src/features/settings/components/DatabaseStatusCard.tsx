import { Database } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DataBackendInfo, TableCounts } from '@/data/ports'
import { ENTITY_NAMES } from '@/domain/schemas'
import { es } from '@/i18n/es'

const copy = es.pages.settings.database

type DatabaseStatusCardProps = {
  info: DataBackendInfo
  /** `undefined` while the first live value is loading. */
  counts: TableCounts | undefined
}

const numberFormat = new Intl.NumberFormat('es-ES')

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">
        {value ?? <span className="bg-muted inline-block h-4 w-8 animate-pulse rounded" />}
      </dd>
    </div>
  )
}

/** Presentational: backend in use, schema version and live row counts. */
export function DatabaseStatusCard({ info, counts }: DatabaseStatusCardProps) {
  const format = (n: number | undefined) => (n === undefined ? undefined : numberFormat.format(n))
  const isEmpty =
    counts !== undefined && counts.events === 0 && ENTITY_NAMES.every((name) => counts[name] === 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="text-muted-foreground size-5" aria-hidden="true" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <dl className="divide-y" aria-busy={counts === undefined}>
          <Row label={copy.backend} value={copy.backends[info.name]} />
          <Row label={copy.schemaVersion} value={String(info.schemaVersion)} />
          <Row label={copy.events} value={format(counts?.events)} />
        </dl>
        <section aria-labelledby="database-tables-title">
          <h3 id="database-tables-title" className="mb-1 text-sm font-medium">
            {copy.tablesTitle}
          </h3>
          <dl className="divide-y" aria-live="polite" aria-busy={counts === undefined}>
            {ENTITY_NAMES.map((name) => (
              <Row key={name} label={copy.tables[name]} value={format(counts?.[name])} />
            ))}
          </dl>
        </section>
        {counts === undefined && <p className="sr-only">{copy.loading}</p>}
        {isEmpty && <p className="text-muted-foreground text-sm md:col-span-2">{copy.emptyHint}</p>}
      </CardContent>
    </Card>
  )
}
