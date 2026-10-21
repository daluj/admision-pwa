import type { BedStatus } from './schemas/bed'
import type { Role } from './schemas/user'

export const AREA_IDS = [
  'overview',
  'beds',
  'emergency',
  'admissions',
  'transfers',
  'tracking',
  'settings',
] as const
export type AreaId = (typeof AREA_IDS)[number]

const ALL_AREAS: readonly AreaId[] = AREA_IDS

/** Which areas each simulated role may open (`specs/domain.md` → Roles). */
export const ROLE_AREAS: Record<Role, readonly AreaId[]> = {
  ADMISSIONS_HEAD: ALL_AREAS,
  MANAGEMENT: ALL_AREAS.filter((area) => area !== 'settings'),
  BED_MANAGER: ['overview', 'beds', 'admissions', 'transfers', 'tracking'],
  ED_COORDINATOR: ['overview', 'emergency', 'beds', 'tracking'],
  NURSE_SUPERVISOR: ['beds', 'admissions', 'tracking'],
  PORTER: ['transfers'],
}

/** Landing page for each role (path of an allowed area). */
export const ROLE_HOME: Record<Role, string> = {
  ADMISSIONS_HEAD: '/',
  MANAGEMENT: '/',
  BED_MANAGER: '/',
  ED_COORDINATOR: '/urgencias',
  NURSE_SUPERVISOR: '/camas',
  PORTER: '/traslados',
}

export function canAccess(role: Role, area: AreaId): boolean {
  return ROLE_AREAS[role].includes(area)
}

export function homeFor(role: Role): string {
  return ROLE_HOME[role]
}

/** What a person can do to a bed from the dashboard (each maps to a domain command). */
export const BED_ACTIONS = [
  'reserve',
  'release',
  'block',
  'unblock',
  'startCleaning',
  'finishCleaning',
] as const
export type BedAction = (typeof BED_ACTIONS)[number]

const NURSE_BED_ACTIONS: readonly BedAction[] = ['startCleaning', 'finishCleaning']

/**
 * Who may act on a bed (`specs/domain.md` → Roles). Bed managers and the head: everything.
 * Nurse supervisors: cleaning on their own unit only. Everyone else: read-only.
 * Fails closed: a supervisor without a unit can do nothing.
 */
export function canActOnBed(
  role: Role,
  action: BedAction,
  scope: { unitId: string; userUnitId?: string | null | undefined },
): boolean {
  if (role === 'ADMISSIONS_HEAD' || role === 'BED_MANAGER') return true
  if (role === 'NURSE_SUPERVISOR') {
    return (
      NURSE_BED_ACTIONS.includes(action) &&
      scope.userUnitId != null &&
      scope.userUnitId === scope.unitId
    )
  }
  return false
}

/** Actions that make sense for a bed in each status (the bed state machine decides the rest). */
export const BED_STATUS_ACTIONS: Record<BedStatus, readonly BedAction[]> = {
  AVAILABLE: ['block'],
  RESERVED: ['release'],
  OCCUPIED: [],
  PENDING_CLEANING: ['startCleaning', 'block'],
  CLEANING: ['finishCleaning', 'block'],
  BLOCKED: ['unblock'],
}
