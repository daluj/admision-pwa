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

/** What a person can do about a patient's discharge (each maps to a domain command). */
export const DISCHARGE_ACTIONS = ['setExpected', 'order'] as const
export type DischargeAction = (typeof DISCHARGE_ACTIONS)[number]

/**
 * Who may set/edit the expected discharge or order the discharge (`specs/domain.md` → Roles):
 * the head of admissions anywhere; a nurse supervisor in their own unit only (fails closed
 * without a unit); everyone else is read-only.
 */
export function canActOnDischarge(
  role: Role,
  _action: DischargeAction,
  scope: { unitId: string; userUnitId?: string | null | undefined },
): boolean {
  if (role === 'ADMISSIONS_HEAD') return true
  if (role === 'NURSE_SUPERVISOR')
    return scope.userUnitId != null && scope.userUnitId === scope.unitId
  return false
}

/** What a person can do about a transfer (each maps to a domain command). */
export const TRANSFER_ACTIONS = [
  'create',
  'assign',
  'cancel',
  'accept',
  'pickUp',
  'deliver',
] as const
export type TransferAction = (typeof TRANSFER_ACTIONS)[number]

/**
 * Who may act on transfers (`specs/domain.md` → Roles). Dispatch (head, bed managers): create,
 * assign and cancel. Porters: accept (self-assign) and, on their OWN jobs, pick up and deliver.
 * Everyone else is read-only. Porter actions fail closed without a linked porter.
 * `jobPorterId` is the porter currently assigned to the transfer; `userPorterId` the login's porter.
 */
export function canActOnTransfer(
  role: Role,
  action: TransferAction,
  scope: { jobPorterId?: string | null | undefined; userPorterId?: string | null | undefined } = {},
): boolean {
  if (role === 'ADMISSIONS_HEAD' || role === 'BED_MANAGER') {
    return action === 'create' || action === 'assign' || action === 'cancel'
  }
  if (role === 'PORTER') {
    if (scope.userPorterId == null) return false
    if (action === 'accept') return true
    if (action === 'pickUp' || action === 'deliver') return scope.jobPorterId === scope.userPorterId
  }
  return false
}
