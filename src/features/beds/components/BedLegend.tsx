import { StatusBadge } from '@/components/dashboard'
import { BED_STATUSES } from '@/domain/schemas'
import { es } from '@/i18n/es'

export function BedLegend() {
  return (
    <ul aria-label={es.pages.beds.unit.legend} className="mb-6 flex flex-wrap gap-2">
      {BED_STATUSES.map((status) => (
        <li key={status}>
          <StatusBadge kind="bed" status={status} />
        </li>
      ))}
    </ul>
  )
}
