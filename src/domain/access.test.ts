import { describe, expect, it } from 'vitest'
import { AREA_IDS, canAccess, homeFor, ROLE_AREAS, ROLE_HOME, type AreaId } from './access'
import { ROLES, type Role } from './schemas/user'

// Home path → area, mirrors components/layout/nav.ts.
const PATH_AREA: Record<string, AreaId> = {
  '/': 'overview',
  '/camas': 'beds',
  '/urgencias': 'emergency',
  '/ingresos-altas': 'admissions',
  '/traslados': 'transfers',
  '/seguimiento': 'tracking',
  '/ajustes': 'settings',
}

const MATRIX: Record<Role, AreaId[]> = {
  ADMISSIONS_HEAD: [...AREA_IDS],
  MANAGEMENT: ['overview', 'beds', 'emergency', 'admissions', 'transfers', 'tracking'],
  BED_MANAGER: ['overview', 'beds', 'admissions', 'transfers', 'tracking'],
  ED_COORDINATOR: ['overview', 'emergency', 'beds', 'tracking'],
  NURSE_SUPERVISOR: ['beds', 'admissions', 'tracking'],
  PORTER: ['transfers'],
}

describe('role access', () => {
  it.each(ROLES)('%s matches the spec matrix', (role) => {
    expect([...ROLE_AREAS[role]].sort()).toEqual([...MATRIX[role]].sort())
    for (const area of AREA_IDS) {
      expect(canAccess(role, area)).toBe(MATRIX[role].includes(area))
    }
  })

  it.each(ROLES)('%s has a home inside its allowed areas', (role) => {
    expect(ROLE_AREAS[role].length).toBeGreaterThan(0)
    const area = PATH_AREA[ROLE_HOME[role]]
    expect(area).toBeDefined()
    expect(canAccess(role, area as AreaId)).toBe(true)
    expect(homeFor(role)).toBe(ROLE_HOME[role])
  })

  it('only the head of admissions reaches settings', () => {
    expect(ROLES.filter((role) => canAccess(role, 'settings'))).toEqual(['ADMISSIONS_HEAD'])
  })
})
