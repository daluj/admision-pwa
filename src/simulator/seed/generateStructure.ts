import type { Bed, IsoDateTime, Porter, Role, Specialty, Unit, User } from '@/domain/schemas'
import { personName } from '../random/names'
import type { Rng } from '../random/prng'
import type { HospitalProfile } from './hospital'

export type HospitalStructure = {
  specialties: Specialty[]
  units: Unit[]
  beds: Bed[]
  porters: Porter[]
  users: User[]
}

/** Lowercase ASCII for usernames ("Ángela Núñez" → "angela.nunez"). */
function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '')
}

/** Users with one role each; nurse supervisors get one per ward / critical-care unit. */
const SINGLE_ROLES: readonly Role[] = [
  'ADMISSIONS_HEAD',
  'BED_MANAGER',
  'ED_COORDINATOR',
  'PORTER',
  'MANAGEMENT',
]

export function generateStructure(
  profile: HospitalProfile,
  rng: Rng,
  anchorAt: IsoDateTime,
): HospitalStructure {
  const ids = rng.fork('structure-ids')
  const people = rng.fork('structure-people')
  const stamp = { createdAt: anchorAt, updatedAt: anchorAt }

  const specialties: Specialty[] = profile.specialties.map((s) => ({
    id: ids.uuid(),
    ...stamp,
    code: s.code,
    name: s.name,
  }))

  const units: Unit[] = []
  const beds: Bed[] = []
  for (const u of profile.units) {
    const unit: Unit = {
      id: ids.uuid(),
      ...stamp,
      code: u.code,
      name: u.name,
      building: u.building,
      floor: u.floor,
      type: u.type,
      specialtyCodes: [...u.specialtyCodes],
      capacity: u.capacity ?? u.beds,
    }
    units.push(unit)
    const building = profile.buildings.find((b) => b.name === u.building)
    if (!building) throw new Error(`Unit ${u.code} references unknown building ${u.building}`)
    for (let i = 0; i < u.beds; i++) {
      const room = building.firstRoom + Math.floor(i / 2)
      beds.push({
        id: ids.uuid(),
        ...stamp,
        unitId: unit.id,
        label: `${u.floor}${String(room).padStart(2, '0')}-${i % 2 === 0 ? 'A' : 'B'}`,
        status: 'AVAILABLE',
        statusChangedAt: anchorAt,
      })
    }
  }

  const porters: Porter[] = []
  for (const shift of ['MORNING', 'AFTERNOON', 'NIGHT'] as const) {
    for (let i = 0; i < profile.porters[shift]; i++) {
      const sex = people.chance(0.5) ? 'F' : 'M'
      const name = personName(people, sex)
      porters.push({
        id: ids.uuid(),
        ...stamp,
        name: `${name.firstName} ${name.lastName}`,
        shift,
        status: shift === profile.shiftOnDuty ? 'AVAILABLE' : 'OFF_SHIFT',
      })
    }
  }

  const usernames = new Set<string>()
  const user = (role: Role, unitId?: string, porterId?: string): User => {
    const name = personName(people, people.chance(0.6) ? 'F' : 'M')
    const base = `${slug(name.firstName)}.${slug(name.lastName.split(' ')[0]!)}`
    let username = base
    for (let n = 2; usernames.has(username); n++) username = `${base}${n}`
    usernames.add(username)
    return {
      id: ids.uuid(),
      ...stamp,
      username,
      displayName: `${name.firstName} ${name.lastName}`,
      role,
      ...(unitId ? { unitId } : {}),
      ...(porterId ? { porterId } : {}),
    }
  }
  // The porter login drives a porter that is on duty at the 08:00 anchor.
  const loginPorter = porters.find((p) => p.status === 'AVAILABLE')
  const users: User[] = [
    ...SINGLE_ROLES.map((role) =>
      role === 'PORTER' ? user(role, undefined, loginPorter?.id) : user(role),
    ),
    ...units.filter((u) => u.type !== 'ED').map((u) => user('NURSE_SUPERVISOR', u.id)),
  ]

  return { specialties, units, beds, porters, users }
}
