import { describe, expect, it } from 'vitest'
import { entitySchemas, ROLES } from '@/domain/schemas'
import { createRng } from '../random/prng'
import { generateStructure } from './generateStructure'
import { DEFAULT_PROFILE } from './hospital'

const ANCHOR = '2026-10-20T06:00:00.000Z'
const structure = generateStructure(DEFAULT_PROFILE, createRng(42), ANCHOR)

describe('generateStructure', () => {
  it('creates the 16 specialties and ~600 inpatient beds', () => {
    expect(structure.specialties).toHaveLength(16)
    expect(structure.beds.length).toBeGreaterThanOrEqual(580)
    expect(structure.beds.length).toBeLessThanOrEqual(620)
    expect(structure.units.length).toBeGreaterThanOrEqual(18)
    expect(structure.units.length).toBeLessThanOrEqual(22)
  })

  it('has ICU, coronary unit and an ED unit without beds', () => {
    const byCode = new Map(structure.units.map((u) => [u.code, u]))
    expect(byCode.get('UCI-2N')).toMatchObject({ type: 'ICU', capacity: 20 })
    expect(byCode.get('UCO-2S')).toMatchObject({ type: 'ICU', capacity: 10 })
    const ed = byCode.get('URG')!
    expect(ed).toMatchObject({ type: 'ED', capacity: 40 })
    expect(structure.beds.filter((b) => b.unitId === ed.id)).toHaveLength(0)
  })

  it('keeps referential integrity and capacity = bed count (except ED)', () => {
    const unitIds = new Set(structure.units.map((u) => u.id))
    for (const bed of structure.beds) expect(unitIds.has(bed.unitId)).toBe(true)
    for (const unit of structure.units.filter((u) => u.type !== 'ED')) {
      expect(structure.beds.filter((b) => b.unitId === unit.id)).toHaveLength(unit.capacity)
    }
    const specialtyCodes = new Set(structure.specialties.map((s) => s.code))
    for (const unit of structure.units) {
      for (const code of unit.specialtyCodes) expect(specialtyCodes.has(code)).toBe(true)
    }
  })

  it('bed labels look like 512-A and are unique hospital-wide', () => {
    for (const bed of structure.beds) expect(bed.label).toMatch(/^\d{3,4}-[AB]$/)
    expect(new Set(structure.beds.map((b) => b.label)).size).toBe(structure.beds.length)
  })

  it('links the porter login to a porter that is on duty', () => {
    const porterUser = structure.users.find((u) => u.role === 'PORTER')!
    const porter = structure.porters.find((p) => p.id === porterUser.porterId)
    expect(porter).toMatchObject({ shift: 'MORNING', status: 'AVAILABLE' })
    expect(
      structure.users.filter((u) => u.role !== 'PORTER').every((u) => u.porterId === undefined),
    ).toBe(true)
  })

  it('has 20 porters across shifts, only the morning shift available', () => {
    expect(structure.porters).toHaveLength(20)
    expect(
      structure.porters.filter((p) => p.shift === 'MORNING').every((p) => p.status === 'AVAILABLE'),
    ).toBe(true)
    expect(
      structure.porters.filter((p) => p.shift !== 'MORNING').every((p) => p.status === 'OFF_SHIFT'),
    ).toBe(true)
  })

  it('has a user per role and a nurse supervisor per inpatient unit', () => {
    for (const role of ROLES) expect(structure.users.some((u) => u.role === role)).toBe(true)
    const supervisors = structure.users.filter((u) => u.role === 'NURSE_SUPERVISOR')
    expect(supervisors).toHaveLength(structure.units.filter((u) => u.type !== 'ED').length)
    expect(new Set(supervisors.map((u) => u.unitId)).size).toBe(supervisors.length)
    expect(new Set(structure.users.map((u) => u.username)).size).toBe(structure.users.length)
    for (const u of structure.users) expect(u.username).toMatch(/^[a-z]+\.[a-z]+\d*$/)
  })

  it('every record passes its schema and ids are unique', () => {
    const all = [
      ...structure.specialties.map((r) => entitySchemas.specialty.safeParse(r)),
      ...structure.units.map((r) => entitySchemas.unit.safeParse(r)),
      ...structure.beds.map((r) => entitySchemas.bed.safeParse(r)),
      ...structure.porters.map((r) => entitySchemas.porter.safeParse(r)),
      ...structure.users.map((r) => entitySchemas.user.safeParse(r)),
    ]
    expect(all.filter((r) => !r.success)).toEqual([])
    const ids = Object.values(structure)
      .flat()
      .map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is deterministic', () => {
    expect(generateStructure(DEFAULT_PROFILE, createRng(42), ANCHOR)).toEqual(structure)
    expect(generateStructure(DEFAULT_PROFILE, createRng(7), ANCHOR).users[0]).not.toEqual(
      structure.users[0],
    )
  })
})
