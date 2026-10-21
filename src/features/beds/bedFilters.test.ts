import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Unit } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import {
  ALL,
  applyFilters,
  DEFAULT_BED_FILTERS,
  filterOptions,
  hasActiveFilters,
  sanitizeFilters,
  readFilters,
  writeFilters,
} from './bedFilters'

const unit = (code: string, extra: Partial<Unit>): Unit => ({
  ...sampleEntities.unit,
  id: code,
  code,
  name: code,
  ...extra,
})
const units = [
  unit('N-CAR', { building: 'Norte', type: 'WARD', specialtyCodes: ['CAR'] }),
  unit('N-MIN', { building: 'Norte', type: 'WARD', specialtyCodes: ['MIN', 'GER'] }),
  unit('S-UCI', { building: 'Sur', type: 'ICU', specialtyCodes: ['MIN'] }),
  unit('URG', { building: 'Norte', type: 'ED', specialtyCodes: [] }),
]
const codes = (filters: Partial<typeof DEFAULT_BED_FILTERS>) =>
  applyFilters(units, { ...DEFAULT_BED_FILTERS, ...filters }).map((u) => u.code)

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('applyFilters', () => {
  it('returns every unit by default', () => {
    expect(codes({})).toEqual(['N-CAR', 'N-MIN', 'S-UCI', 'URG'])
    expect(hasActiveFilters(DEFAULT_BED_FILTERS)).toBe(false)
  })

  it('filters by building, type and specialty, combined with AND', () => {
    expect(codes({ building: 'Sur' })).toEqual(['S-UCI'])
    expect(codes({ type: 'WARD' })).toEqual(['N-CAR', 'N-MIN'])
    expect(codes({ specialty: 'MIN' })).toEqual(['N-MIN', 'S-UCI'])
    expect(codes({ type: 'WARD', specialty: 'MIN' })).toEqual(['N-MIN'])
    expect(codes({ building: 'Sur', type: 'WARD' })).toEqual([])
    expect(hasActiveFilters({ ...DEFAULT_BED_FILTERS, type: 'ICU' })).toBe(true)
  })
})

describe('filterOptions', () => {
  it('offers only what exists in units with beds, sorted, with specialty names', () => {
    const options = filterOptions(units, [
      { ...sampleEntities.specialty, id: '1', code: 'MIN', name: 'Medicina Interna' },
      { ...sampleEntities.specialty, id: '2', code: 'CAR', name: 'Cardiología' },
      { ...sampleEntities.specialty, id: '3', code: 'PED', name: 'Pediatría' },
    ])
    expect(options.buildings).toEqual(['Norte', 'Sur'])
    expect(options.types).toEqual(['ICU', 'WARD'])
    expect(options.specialties).toEqual([
      { code: 'CAR', name: 'Cardiología' },
      { code: 'MIN', name: 'Medicina Interna' },
    ])
  })
})

describe('sanitizeFilters', () => {
  const options = filterOptions(units, [
    { ...sampleEntities.specialty, id: '1', code: 'CAR', name: 'Cardiología' },
    { ...sampleEntities.specialty, id: '2', code: 'MIN', name: 'Medicina Interna' },
  ])

  it('keeps values that are still offered', () => {
    const filters = { building: 'Norte', type: 'WARD', specialty: 'CAR' } as const
    expect(sanitizeFilters(filters, options)).toEqual(filters)
  })

  it('resets saved values the hospital no longer has', () => {
    expect(
      sanitizeFilters(
        { building: 'Edificio Fantasma', type: 'INTERMEDIATE', specialty: 'ZZZ' },
        options,
      ),
    ).toEqual(DEFAULT_BED_FILTERS)
    expect(sanitizeFilters({ building: 'Sur', type: 'ICU', specialty: 'ZZZ' }, options)).toEqual({
      building: 'Sur',
      type: 'ICU',
      specialty: ALL,
    })
  })
})

describe('persistence', () => {
  it('stores filters per user', () => {
    writeFilters('u1', { building: 'Norte', type: 'ICU', specialty: ALL })
    expect(readFilters('u1')).toEqual({ building: 'Norte', type: 'ICU', specialty: ALL })
    expect(readFilters('u2')).toEqual(DEFAULT_BED_FILTERS)
  })

  it('falls back to defaults on corrupt data', () => {
    window.localStorage.setItem('torre-control.filters.beds.u1', '{nope')
    expect(readFilters('u1')).toEqual(DEFAULT_BED_FILTERS)
    window.localStorage.setItem(
      'torre-control.filters.beds.u1',
      JSON.stringify({ building: 'x', type: 'SPACESHIP', specialty: 'y' }),
    )
    expect(readFilters('u1')).toEqual(DEFAULT_BED_FILTERS)
  })

  it('tolerates storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(readFilters('u1')).toEqual(DEFAULT_BED_FILTERS)
    expect(() => writeFilters('u1', DEFAULT_BED_FILTERS)).not.toThrow()
  })
})
