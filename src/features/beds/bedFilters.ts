import { z } from 'zod'
import { UnitType, type Specialty, type Unit } from '@/domain/schemas'

export const ALL = 'all'

export type BedFilters = {
  building: string
  type: UnitType | typeof ALL
  specialty: string
}

export const DEFAULT_BED_FILTERS: BedFilters = { building: ALL, type: ALL, specialty: ALL }

export const hasActiveFilters = (filters: BedFilters): boolean =>
  filters.building !== ALL || filters.type !== ALL || filters.specialty !== ALL

/** Units matching every active filter (a unit matches a specialty when it treats it). */
export function applyFilters(units: readonly Unit[], filters: BedFilters): Unit[] {
  return units.filter(
    (unit) =>
      (filters.building === ALL || unit.building === filters.building) &&
      (filters.type === ALL || unit.type === filters.type) &&
      (filters.specialty === ALL || unit.specialtyCodes.includes(filters.specialty)),
  )
}

export type FilterOptions = {
  buildings: string[]
  types: UnitType[]
  specialties: Array<{ code: string; name: string }>
}

/** Choices offered by the filters: only what exists in units that have beds. */
export function filterOptions(
  units: readonly Unit[],
  specialties: readonly Specialty[],
): FilterOptions {
  const withBeds = units.filter((unit) => unit.type !== 'ED')
  const codes = new Set(withBeds.flatMap((unit) => unit.specialtyCodes))
  return {
    buildings: [...new Set(withBeds.map((unit) => unit.building))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    ),
    types: [...new Set(withBeds.map((unit) => unit.type))].sort(),
    specialties: specialties
      .filter((specialty) => codes.has(specialty.code))
      .map(({ code, name }) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
  }
}

const StoredFilters = z.object({
  building: z.string(),
  type: z.union([z.literal(ALL), UnitType]),
  specialty: z.string(),
})

const storageKey = (userId: string) => `torre-control.filters.beds.${userId}`

/** Filters saved for this user, or the defaults (storage can be missing, blocked or corrupt). */
export function readFilters(userId: string): BedFilters {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (raw === null) return DEFAULT_BED_FILTERS
    const parsed = StoredFilters.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_BED_FILTERS
  } catch {
    return DEFAULT_BED_FILTERS
  }
}

export function writeFilters(userId: string, filters: BedFilters): void {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(filters))
  } catch {
    // Storage unavailable: filters only last for this visit.
  }
}
