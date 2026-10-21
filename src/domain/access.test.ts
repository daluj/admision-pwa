import { describe, expect, it } from 'vitest'
import {
  AREA_IDS,
  BED_ACTIONS,
  BED_STATUS_ACTIONS,
  canAccess,
  canActOnBed,
  canActOnDischarge,
  canActOnTransfer,
  TRANSFER_ACTIONS,
  DISCHARGE_ACTIONS,
  homeFor,
  ROLE_AREAS,
  ROLE_HOME,
  type AreaId,
} from './access'
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

describe('canActOnBed', () => {
  const own = { unitId: 'u1', userUnitId: 'u1' }
  const other = { unitId: 'u2', userUnitId: 'u1' }

  it.each(['ADMISSIONS_HEAD', 'BED_MANAGER'] as const)('%s may do everything anywhere', (role) => {
    for (const action of BED_ACTIONS) {
      expect(canActOnBed(role, action, own)).toBe(true)
      expect(canActOnBed(role, action, other)).toBe(true)
    }
  })

  it('a nurse supervisor may only clean, and only in their own unit', () => {
    for (const action of BED_ACTIONS) {
      const clean = action === 'startCleaning' || action === 'finishCleaning'
      expect(canActOnBed('NURSE_SUPERVISOR', action, own)).toBe(clean)
      expect(canActOnBed('NURSE_SUPERVISOR', action, other)).toBe(false)
    }
  })

  it('a nurse supervisor without a unit can do nothing (fails closed)', () => {
    for (const action of BED_ACTIONS) {
      expect(canActOnBed('NURSE_SUPERVISOR', action, { unitId: 'u1' })).toBe(false)
      expect(canActOnBed('NURSE_SUPERVISOR', action, { unitId: 'u1', userUnitId: null })).toBe(
        false,
      )
    }
  })

  it.each(['ED_COORDINATOR', 'MANAGEMENT', 'PORTER'] as const)('%s is read-only', (role) => {
    for (const action of BED_ACTIONS) expect(canActOnBed(role, action, own)).toBe(false)
  })

  it('maps each bed status to the actions that make sense', () => {
    expect(BED_STATUS_ACTIONS).toEqual({
      AVAILABLE: ['block'],
      RESERVED: ['release'],
      OCCUPIED: [],
      PENDING_CLEANING: ['startCleaning', 'block'],
      CLEANING: ['finishCleaning', 'block'],
      BLOCKED: ['unblock'],
    })
  })
})

describe('canActOnDischarge', () => {
  const own = { unitId: 'u1', userUnitId: 'u1' }
  const other = { unitId: 'u2', userUnitId: 'u1' }

  it('the head may act anywhere', () => {
    for (const action of DISCHARGE_ACTIONS) {
      expect(canActOnDischarge('ADMISSIONS_HEAD', action, own)).toBe(true)
      expect(canActOnDischarge('ADMISSIONS_HEAD', action, other)).toBe(true)
    }
  })

  it('a nurse supervisor only in their own unit, and never without a unit', () => {
    for (const action of DISCHARGE_ACTIONS) {
      expect(canActOnDischarge('NURSE_SUPERVISOR', action, own)).toBe(true)
      expect(canActOnDischarge('NURSE_SUPERVISOR', action, other)).toBe(false)
      expect(canActOnDischarge('NURSE_SUPERVISOR', action, { unitId: 'u1' })).toBe(false)
      expect(
        canActOnDischarge('NURSE_SUPERVISOR', action, { unitId: 'u1', userUnitId: null }),
      ).toBe(false)
    }
  })

  it.each(['BED_MANAGER', 'ED_COORDINATOR', 'MANAGEMENT', 'PORTER'] as const)(
    '%s is read-only',
    (role) => {
      for (const action of DISCHARGE_ACTIONS)
        expect(canActOnDischarge(role, action, own)).toBe(false)
    },
  )
})

describe('canActOnTransfer', () => {
  it.each(['ADMISSIONS_HEAD', 'BED_MANAGER'] as const)(
    '%s dispatches: create, assign, cancel — not the porter steps',
    (role) => {
      for (const action of TRANSFER_ACTIONS) {
        expect(canActOnTransfer(role, action)).toBe(
          action === 'create' || action === 'assign' || action === 'cancel',
        )
      }
    },
  )

  it('a porter accepts for themselves and moves only their own jobs', () => {
    const mine = { userPorterId: 'p1', jobPorterId: 'p1' }
    const theirs = { userPorterId: 'p1', jobPorterId: 'p2' }
    expect(canActOnTransfer('PORTER', 'accept', mine)).toBe(true)
    expect(canActOnTransfer('PORTER', 'pickUp', mine)).toBe(true)
    expect(canActOnTransfer('PORTER', 'deliver', mine)).toBe(true)
    expect(canActOnTransfer('PORTER', 'pickUp', theirs)).toBe(false)
    expect(canActOnTransfer('PORTER', 'deliver', { userPorterId: 'p1' })).toBe(false) // unassigned job
    for (const action of ['create', 'assign', 'cancel'] as const)
      expect(canActOnTransfer('PORTER', action, mine)).toBe(false)
  })

  it('a porter without a linked porter can do nothing (fails closed)', () => {
    for (const action of TRANSFER_ACTIONS) {
      expect(canActOnTransfer('PORTER', action, { jobPorterId: 'p1' })).toBe(false)
      expect(canActOnTransfer('PORTER', action, { userPorterId: null, jobPorterId: null })).toBe(
        false,
      )
    }
  })

  it.each(['MANAGEMENT', 'NURSE_SUPERVISOR', 'ED_COORDINATOR'] as const)(
    '%s is read-only',
    (role) => {
      for (const action of TRANSFER_ACTIONS)
        expect(canActOnTransfer(role, action, { userPorterId: 'p1', jobPorterId: 'p1' })).toBe(
          false,
        )
    },
  )
})
