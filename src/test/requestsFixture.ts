import type { Change, DataBackend } from '@/data/ports'
import type { Unit } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { CENSUS_NOW, seedCensus, WARD } from './censusFixture'

const ago = (minutes: number) => new Date(Date.parse(CENSUS_NOW) - minutes * 60_000).toISOString()

const patient = (id: string, firstName: string, lastName: string) =>
  ({
    ...sampleEntities.patient,
    id,
    mrn: `SIM-${id.toUpperCase()}`,
    firstName,
    lastName,
  }) as const

const admission = (id: string, patientId: string, extra = {}) =>
  ({
    ...sampleEntities.admission,
    id,
    patientId,
    edVisitId: undefined,
    specialtyCode: 'CAR',
    status: 'AWAITING_BED',
    ...extra,
  }) as const

const request = (id: string, admissionId: string, extra = {}) =>
  ({
    ...sampleEntities.bedRequest,
    id,
    admissionId,
    status: 'OPEN',
    priority: 'P2',
    requiredUnitType: 'WARD',
    preferredSpecialtyCode: 'CAR',
    isolationRequired: false,
    ...extra,
  }) as const

const bed = (id: string, unitId: string, extra = {}) =>
  ({
    ...sampleEntities.bed,
    id,
    unitId,
    label: id,
    status: 'AVAILABLE',
    statusChangedAt: ago(30),
    ...extra,
  }) as const

/** A medicine ward (MIN) with one free bed: an outlier option for cardiology requests. */
export const MIN_WARD: Unit = {
  ...sampleEntities.unit,
  id: 'u-min',
  code: 'MIN-4N',
  name: 'Medicina Interna 4ª Norte',
  building: 'Edificio Norte',
  floor: 4,
  specialtyCodes: ['MIN'],
}

/**
 * Census fixture plus open requests:
 * - `r-old` P1 cardiology from the ED (triage 2), waiting 3 h;
 * - `r-new` P1 cardiology scheduled, waiting 10 min;
 * - `r-iso` P2 cardiology needing isolation, 90 min;
 * - `r-low` P3 medicine, 5 h; `r-done` already ASSIGNED.
 * Free beds: A3 (CAR, free 30 min… set by the census fixture), A8 (CAR, free 2 h), A9 (CAR, isolation),
 * M1 (MIN ward, outlier for cardiology).
 */
export async function seedRequests(backend: DataBackend): Promise<void> {
  await seedCensus(backend)
  const rows: Change[] = [
    { entity: 'unit', op: 'put', record: MIN_WARD },
    ...[
      bed('A8', WARD.id, { statusChangedAt: ago(120) }),
      bed('A9', WARD.id, { isolation: true, statusChangedAt: ago(200) }),
      bed('M1', MIN_WARD.id, { statusChangedAt: ago(500) }),
    ].map((record): Change => ({ entity: 'bed', op: 'put', record })),
    ...[
      patient('q1', 'Irene', 'Lara Mora'),
      patient('q2', 'Pablo', 'Gil Sanz'),
      patient('q3', 'Rosa', 'Vega Ruiz'),
      patient('q4', 'Hugo', 'Díaz Soto'),
      patient('q5', 'Nora', 'Pons Gil'),
    ].map((record): Change => ({ entity: 'patient', op: 'put', record })),
    {
      entity: 'edVisit',
      op: 'put',
      record: { ...sampleEntities.edVisit, id: 'v-old', patientId: 'q1', triageLevel: 2 },
    },
    ...[
      admission('ar-old', 'q1', { edVisitId: 'v-old' }),
      admission('ar-new', 'q2', { type: 'SCHEDULED' }),
      admission('ar-iso', 'q3'),
      admission('ar-low', 'q4', { specialtyCode: 'MIN' }),
      admission('ar-done', 'q5', { status: 'BED_ASSIGNED', bedId: 'A3' }),
    ].map((record): Change => ({ entity: 'admission', op: 'put', record })),
    ...[
      request('r-old', 'ar-old', { priority: 'P1', requestedAt: ago(180) }),
      request('r-new', 'ar-new', { priority: 'P1', requestedAt: ago(10) }),
      request('r-iso', 'ar-iso', { priority: 'P2', requestedAt: ago(90), isolationRequired: true }),
      request('r-low', 'ar-low', {
        priority: 'P3',
        requestedAt: ago(300),
        preferredSpecialtyCode: 'MIN',
      }),
      request('r-done', 'ar-done', {
        status: 'ASSIGNED',
        assignedBedId: 'A3',
        requestedAt: ago(60),
      }),
    ].map((record): Change => ({ entity: 'bedRequest', op: 'put', record })),
  ]
  await backend.events.append([], rows)
}
