import type { Code, Shift, UnitType } from '@/domain/schemas'

/**
 * Hospital structure and live-state targets for the synthetic seed. DATA ONLY: real figures for
 * the hospital will replace this file without code changes (see specs/domain.md → Synthetic Hospital).
 */

export type SpecialtyProfile = { code: Code; name: string }

export type UnitProfile = {
  code: Code
  name: string
  building: string
  floor: number
  type: UnitType
  specialtyCodes: Code[]
  /** Beds generated for the unit (ED: 0 — treatment spaces are `capacity`). */
  beds: number
  /** ED only: treatment spaces. Defaults to `beds`. */
  capacity?: number
}

export type BuildingProfile = {
  name: string
  /** First room number on each floor, so bed labels are unique hospital-wide (e.g. 01 vs 51). */
  firstRoom: number
}

export type HospitalProfile = {
  profileId: string
  buildings: BuildingProfile[]
  specialties: SpecialtyProfile[]
  units: UnitProfile[]
  porters: Record<Shift, number>
  /** Shift on duty at the 08:00 anchor (its porters are AVAILABLE, the others OFF_SHIFT). */
  shiftOnDuty: Shift
  targets: {
    /** Occupied ÷ operational beds, hospital-wide. */
    occupancy: number
    /** Occupancy for ICU-type units. */
    criticalCareOccupancy: number
    blockedShare: number
    pendingCleaningShare: number
    cleaningShare: number
    urgentAdmissionShare: number
    expectedDischargeTodayShare: number
    expectedDischargeTomorrowShare: number
    dischargeOrdered: number
    outlierShare: number
    maxLosDays: number
    ed: {
      visits: number
      /** Visits per phase at the anchor. */
      phases: { ARRIVED: number; TRIAGED: number; IN_ASSESSMENT: number; ADMIT_DECISION: number }
      /** Manchester level → share. */
      triage: Record<1 | 2 | 3 | 4 | 5, number>
      maxHoursInEd: number
      /** Boarding patients that already have a RESERVED bed. */
      boardingWithReservedBed: number
    }
    scheduledAdmissionsToday: number
    openTransfers: number
  }
}

const NORTE = 'Edificio Norte'
const SUR = 'Edificio Sur'

const ward = (
  code: Code,
  name: string,
  building: string,
  floor: number,
  specialtyCodes: Code[],
  beds: number,
): UnitProfile => ({ code, name, building, floor, type: 'WARD', specialtyCodes, beds })

export const DEFAULT_PROFILE: HospitalProfile = {
  profileId: 'tertiary-600',
  buildings: [
    { name: NORTE, firstRoom: 1 },
    { name: SUR, firstRoom: 51 },
  ],
  specialties: [
    { code: 'MIN', name: 'Medicina Interna' },
    { code: 'CAR', name: 'Cardiología' },
    { code: 'NML', name: 'Neumología' },
    { code: 'DIG', name: 'Digestivo' },
    { code: 'NRL', name: 'Neurología' },
    { code: 'NEF', name: 'Nefrología' },
    { code: 'ONC', name: 'Oncología' },
    { code: 'HEM', name: 'Hematología' },
    { code: 'GER', name: 'Geriatría' },
    { code: 'CGD', name: 'Cirugía General' },
    { code: 'TRA', name: 'Traumatología' },
    { code: 'URO', name: 'Urología' },
    { code: 'NCR', name: 'Neurocirugía' },
    { code: 'GOB', name: 'Ginecología y Obstetricia' },
    { code: 'PED', name: 'Pediatría' },
    { code: 'PSQ', name: 'Psiquiatría' },
  ],
  units: [
    // Edificio Norte — medical
    ward('MIN-3N', 'Medicina Interna 3ª Norte', NORTE, 3, ['MIN'], 36),
    ward('MIN-4N', 'Medicina Interna 4ª Norte', NORTE, 4, ['MIN'], 36),
    ward('GER-5N', 'Geriatría 5ª Norte', NORTE, 5, ['GER'], 36),
    ward('NML-6N', 'Neumología 6ª Norte', NORTE, 6, ['NML'], 36),
    ward('CAR-7N', 'Cardiología 7ª Norte', NORTE, 7, ['CAR'], 32),
    ward('DIG-8N', 'Digestivo 8ª Norte', NORTE, 8, ['DIG'], 34),
    ward('NRL-9N', 'Neurología 9ª Norte', NORTE, 9, ['NRL'], 32),
    ward('NEF-10N', 'Nefrología 10ª Norte', NORTE, 10, ['NEF'], 28),
    ward('ONC-11N', 'Oncología y Hematología 11ª Norte', NORTE, 11, ['ONC', 'HEM'], 36),
    // Edificio Sur — surgical, women & children, mental health
    ward('CGD-3S', 'Cirugía General 3ª Sur', SUR, 3, ['CGD'], 36),
    ward('CGU-4S', 'Cirugía General y Urología 4ª Sur', SUR, 4, ['CGD', 'URO'], 34),
    ward('TRA-5S', 'Traumatología 5ª Sur', SUR, 5, ['TRA'], 36),
    ward('NCR-6S', 'Neurocirugía 6ª Sur', SUR, 6, ['NCR'], 28),
    ward('GOB-7S', 'Ginecología y Obstetricia 7ª Sur', SUR, 7, ['GOB'], 36),
    ward('PED-8S', 'Pediatría 8ª Sur', SUR, 8, ['PED'], 30),
    ward('PSQ-9S', 'Psiquiatría 9ª Sur', SUR, 9, ['PSQ'], 28),
    ward('MIN-10S', 'Medicina Interna 10ª Sur', SUR, 10, ['MIN'], 36),
    // Critical care
    {
      code: 'UCI-2N',
      name: 'Unidad de Cuidados Intensivos',
      building: NORTE,
      floor: 2,
      type: 'ICU',
      specialtyCodes: ['MIN', 'CGD', 'NCR'],
      beds: 20,
    },
    {
      code: 'UCO-2S',
      name: 'Unidad Coronaria',
      building: SUR,
      floor: 2,
      type: 'ICU',
      specialtyCodes: ['CAR'],
      beds: 10,
    },
    // Emergency Department (treatment spaces, not inpatient beds)
    {
      code: 'URG',
      name: 'Urgencias',
      building: NORTE,
      floor: 0,
      type: 'ED',
      specialtyCodes: [],
      beds: 0,
      capacity: 40,
    },
  ],
  porters: { MORNING: 8, AFTERNOON: 7, NIGHT: 5 },
  shiftOnDuty: 'MORNING',
  targets: {
    occupancy: 0.85,
    criticalCareOccupancy: 0.9,
    blockedShare: 0.02,
    pendingCleaningShare: 0.02,
    cleaningShare: 0.01,
    urgentAdmissionShare: 0.7,
    expectedDischargeTodayShare: 0.3,
    expectedDischargeTomorrowShare: 0.25,
    dischargeOrdered: 5,
    outlierShare: 0.04,
    maxLosDays: 20,
    ed: {
      visits: 40,
      phases: { ARRIVED: 6, TRIAGED: 10, IN_ASSESSMENT: 16, ADMIT_DECISION: 8 },
      triage: { 1: 0.01, 2: 0.1, 3: 0.35, 4: 0.4, 5: 0.14 },
      maxHoursInEd: 14,
      boardingWithReservedBed: 2,
    },
    scheduledAdmissionsToday: 15,
    openTransfers: 3,
  },
}
