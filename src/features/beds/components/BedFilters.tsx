import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { es } from '@/i18n/es'
import {
  ALL,
  hasActiveFilters,
  type BedFilters as Filters,
  type FilterOptions,
} from '../bedFilters'

const copy = es.pages.beds.filters
const SELECT = 'border-input bg-background h-9 rounded-md border px-2 text-sm'

type BedFiltersProps = {
  filters: Filters
  options: FilterOptions
  onChange: (filters: Filters) => void
}

export function BedFilters({ filters, options, onChange }: BedFiltersProps) {
  const ids = { building: useId(), type: useId(), specialty: useId() }
  return (
    <div role="group" aria-label={copy.label} className="mb-6 flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.building}>{copy.building}</Label>
        <select
          id={ids.building}
          className={SELECT}
          value={filters.building}
          onChange={(e) => onChange({ ...filters, building: e.target.value })}
        >
          <option value={ALL}>{copy.all}</option>
          {options.buildings.map((building) => (
            <option key={building} value={building}>
              {building}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.type}>{copy.type}</Label>
        <select
          id={ids.type}
          className={SELECT}
          value={filters.type}
          onChange={(e) => onChange({ ...filters, type: e.target.value as Filters['type'] })}
        >
          <option value={ALL}>{copy.all}</option>
          {options.types.map((type) => (
            <option key={type} value={type}>
              {es.pages.beds.unitTypes[type]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.specialty}>{copy.specialty}</Label>
        <select
          id={ids.specialty}
          className={SELECT}
          value={filters.specialty}
          onChange={(e) => onChange({ ...filters, specialty: e.target.value })}
        >
          <option value={ALL}>{copy.all}</option>
          {options.specialties.map((specialty) => (
            <option key={specialty.code} value={specialty.code}>
              {specialty.name}
            </option>
          ))}
        </select>
      </div>
      {hasActiveFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ building: ALL, type: ALL, specialty: ALL })}
        >
          {copy.clear}
        </Button>
      )}
    </div>
  )
}
