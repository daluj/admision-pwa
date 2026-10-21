import type { UnitCensus } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { UnitCard } from './UnitCard'

const copy = es.pages.beds.grid

export function UnitGrid({ units }: { units: readonly UnitCensus[] }) {
  return (
    <section aria-labelledby="unit-grid-title">
      <h2 id="unit-grid-title" className="mb-3 text-lg font-semibold">
        {copy.title}
      </h2>
      {units.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
          {copy.noMatches}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {units.map((census) => (
            <UnitCard key={census.unit.id} census={census} />
          ))}
        </ul>
      )}
    </section>
  )
}
