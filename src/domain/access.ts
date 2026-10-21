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
