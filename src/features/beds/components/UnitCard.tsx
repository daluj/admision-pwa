import { Link } from 'react-router'
import { BED_STATUS_STYLES } from '@/components/dashboard'
import { Badge } from '@/components/ui/badge'
import type { UnitCensus } from '@/domain/kpis'
import { BED_STATUSES } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'
import { occupancyStatus } from '@/domain/kpis'

const copy = es.pages.beds

/** One unit: occupancy, a stacked status bar (with the counts in text) and a link to its bed map. */
export function UnitCard({ census }: { census: UnitCensus }) {
  const { unit, kpis } = census
  const { counts } = kpis
  const present = BED_STATUSES.filter((status) => counts[status] > 0)
  const summary = present.map((status) => `${copy.status[status]} ${counts[status]}`).join(', ')
  const level = occupancyStatus(kpis.occupancy)

  return (
    <li>
      <Link
        to={`/camas/${unit.code}`}
        aria-label={copy.grid.openUnit(unit.name)}
        className="bg-card hover:bg-accent focus-visible:ring-ring block h-full rounded-lg border p-4 shadow-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{unit.name}</h3>
            <p className="text-muted-foreground text-xs">
              {copy.grid.floor(unit.building, unit.floor)}
            </p>
          </div>
          <Badge variant="outline">{copy.unitTypes[unit.type]}</Badge>
        </div>

        <p
          data-level={level}
          className={cn(
            'mt-3 text-2xl font-semibold tabular-nums',
            level === 'critical' && 'text-status-critical',
          )}
        >
          {copy.grid.occupancy(Math.round(kpis.occupancy * 100))}
        </p>

        <div
          role="img"
          aria-label={copy.grid.statusBar(unit.name, summary)}
          className="bg-muted mt-2 flex h-2 overflow-hidden rounded-full"
        >
          {present.map((status) => (
            <span
              key={status}
              data-status={status}
              className={BED_STATUS_STYLES[status].classes}
              style={{ width: `${(counts[status] / counts.total) * 100}%` }}
            />
          ))}
        </div>

        <ul className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          {present.map((status) => (
            <li key={status} className="whitespace-nowrap tabular-nums">
              {copy.status[status]}{' '}
              <span className="text-foreground font-medium">{counts[status]}</span>
            </li>
          ))}
        </ul>
        {kpis.outliers > 0 && (
          <p className="text-muted-foreground mt-1 text-xs">{copy.grid.outliers(kpis.outliers)}</p>
        )}
      </Link>
    </li>
  )
}
