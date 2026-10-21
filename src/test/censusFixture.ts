import type { Change, DataBackend } from '@/data/ports'
import type { Admission, Bed, Patient, Unit } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'

/** 12:00 in Madrid. */
export const CENSUS_NOW = '2026-10-21T10:00:00.000Z'
const hours = (h: number) => new Date(Date.parse(CENSUS_NOW) + h * 3_600_000).toISOString()

export const WARD: Unit = {
  ...sampleEntities.unit,
  id: 'u-ward',
  code: 'CAR-5N',
  name: 'Cardiología 5ª Norte',
  building: 'Edificio Norte',
  floor: 5,
  specialtyCodes: ['CAR'],
}
export const ICU: Unit = {
  ...sampleEntities.unit,
  id: 'u-icu',
  code: 'UCI',
  name: 'UCI',
  building: 'Edificio Sur',
  floor: 1,
  type: 'ICU',
  specialtyCodes: ['MIN'],
}

const bed = (id: string, unitId: string, status: Bed['status'], extra: Partial<Bed> = {}): Bed => ({
  ...sampleEntities.bed,
  id,
  unitId,
  label: id,
  status,
  statusChangedAt: CENSUS_NOW,
  ...extra,
})
const patient = (id: string, firstName: string, lastName: string): Patient => ({
  ...sampleEntities.patient,
  id,
  mrn: `SIM-${id.toUpperCase()}`,
  firstName,
  lastName,
})
const admission = (id: string, patientId: string, extra: Partial<Admission>): Admission => ({
  ...sampleEntities.admission,
  id,
  patientId,
  edVisitId: undefined,
  specialtyCode: 'CAR',
  status: 'ADMITTED',
  ...extra,
})

/**
 * Ward A1–A7 + a one-bed ICU:
 * 2 occupied (one outlier with discharge ordered), 1 free, 1 pending cleaning, 1 cleaning,
 * 1 blocked for 4 days, 1 reserved; ICU bed occupied. Expected today: A1 and a discharged patient.
 */
export const censusRows: Change[] = [
  {
    entity: 'simulationState',
    op: 'put',
    record: { ...sampleEntities.simulationState, simNow: CENSUS_NOW },
  },
  { entity: 'unit', op: 'put', record: WARD },
  { entity: 'unit', op: 'put', record: ICU },
  ...[
    bed('A1', 'u-ward', 'OCCUPIED', { patientId: 'p1', admissionId: 'a1' }),
    bed('A2', 'u-ward', 'OCCUPIED', { patientId: 'p2', admissionId: 'a2' }),
    bed('A3', 'u-ward', 'AVAILABLE'),
    bed('A4', 'u-ward', 'PENDING_CLEANING'),
    bed('A5', 'u-ward', 'CLEANING'),
    bed('A6', 'u-ward', 'BLOCKED', { blockedReason: 'Avería', statusChangedAt: hours(-96) }),
    bed('A7', 'u-ward', 'RESERVED', { patientId: 'p3', admissionId: 'a3' }),
    bed('I1', 'u-icu', 'OCCUPIED', { patientId: 'p4', admissionId: 'a4' }),
  ].map((record): Change => ({ entity: 'bed', op: 'put', record })),
  ...[
    patient('p1', 'María', 'García Ruiz'),
    patient('p2', 'Luis', 'Pérez Gil'),
    patient('p3', 'Ana', 'Sanz Mora'),
    patient('p4', 'Pau', 'Vega Díaz'),
    patient('p5', 'Eva', 'Lara Nieto'),
  ].map((record): Change => ({ entity: 'patient', op: 'put', record })),
  ...[
    admission('a1', 'p1', { bedId: 'A1', admittedAt: hours(-50), expectedDischargeAt: hours(2) }),
    admission('a2', 'p2', {
      bedId: 'A2',
      specialtyCode: 'MIN',
      status: 'DISCHARGE_ORDERED',
      admittedAt: hours(-30),
      expectedDischargeAt: hours(24),
    }),
    admission('a3', 'p3', { bedId: 'A7', status: 'BED_ASSIGNED' }),
    admission('a4', 'p4', { bedId: 'I1', admittedAt: hours(-5) }),
    admission('d1', 'p5', {
      bedId: 'A3',
      status: 'DISCHARGED',
      admittedAt: hours(-100),
      expectedDischargeAt: hours(-1),
      dischargedAt: hours(-1),
    }),
  ].map((record): Change => ({ entity: 'admission', op: 'put', record })),
]

export async function seedCensus(backend: DataBackend): Promise<void> {
  await backend.events.append([], censusRows)
}
