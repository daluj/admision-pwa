import type { Change, DataBackend } from '@/data/ports'
import type {
  Admission,
  Bed,
  EdVisit,
  HospitalEvent,
  Patient,
  Specialty,
  Unit,
} from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import type { AdmissionsInput } from '@/domain/kpis'

/** 12:00 in Madrid; the local day runs 2026-10-20T22:00Z – 2026-10-21T22:00Z. */
export const ADM_NOW = '2026-10-21T10:00:00.000Z'
const at = (iso: string) => iso

const unit = (id: string, code: string, name: string, spec: string): Unit => ({
  ...sampleEntities.unit,
  id,
  code,
  name,
  building: 'Edificio Norte',
  floor: id === 'u1' ? 5 : 6,
  specialtyCodes: [spec],
})
const units = [
  unit('u1', 'CAR-5N', 'Cardiología 5ª Norte', 'CAR'),
  unit('u2', 'MIN-6N', 'Medicina Interna 6ª Norte', 'MIN'),
]

const bed = (id: string, unitId: string, status: Bed['status']): Bed => ({
  ...sampleEntities.bed,
  id,
  unitId,
  label: id.toUpperCase(),
  status,
  statusChangedAt: ADM_NOW,
})
const beds: Bed[] = [
  bed('b1', 'u1', 'OCCUPIED'),
  bed('b2', 'u1', 'OCCUPIED'),
  bed('b3', 'u1', 'AVAILABLE'),
  bed('b4', 'u1', 'AVAILABLE'),
  bed('b5', 'u2', 'OCCUPIED'),
  bed('b6', 'u2', 'OCCUPIED'),
  bed('b7', 'u2', 'OCCUPIED'),
  bed('b8', 'u2', 'AVAILABLE'),
]

const FIRST = [
  'María',
  'Luis',
  'Ana',
  'Pau',
  'Eva',
  'Hugo',
  'Nora',
  'Iker',
  'Lola',
  'Raúl',
  'Inés',
  'Teo',
  'Alba',
  'Leo',
  'Zoe',
  'Biel',
  'Mar',
  'Pol',
]
const patients: Patient[] = []
let n = 0
const adm = (id: string, extra: Partial<Admission>): Admission => {
  patients.push({
    ...sampleEntities.patient,
    id: `p-${id}`,
    mrn: `SIM-${id.toUpperCase()}`,
    firstName: FIRST[n++ % FIRST.length]!,
    lastName: 'García Ruiz',
  })
  return {
    ...sampleEntities.admission,
    id,
    patientId: `p-${id}`,
    edVisitId: undefined,
    type: 'URGENT',
    specialtyCode: 'CAR',
    status: 'ADMITTED',
    admittedAt: at('2026-10-15T08:00:00.000Z'),
    ...extra,
  }
}

const admissions: Admission[] = [
  // Discharged today: 10:00 and 11:30 local (before noon) and 12:00 local (not before).
  adm('d1', {
    status: 'DISCHARGED',
    bedId: 'b1',
    expectedDischargeAt: at('2026-10-21T08:00:00.000Z'),
    dischargedAt: at('2026-10-21T08:00:00.000Z'),
  }),
  adm('d2', {
    status: 'DISCHARGED',
    type: 'SCHEDULED',
    specialtyCode: 'MIN',
    bedId: 'b5',
    expectedDischargeAt: at('2026-10-21T09:00:00.000Z'),
    dischargedAt: at('2026-10-21T09:30:00.000Z'),
  }),
  adm('d3', {
    status: 'DISCHARGED',
    bedId: 'b3',
    expectedDischargeAt: at('2026-10-21T09:00:00.000Z'),
    dischargedAt: at('2026-10-21T10:00:00.000Z'),
  }),
  adm('d4', {
    status: 'DISCHARGED',
    bedId: 'b4',
    expectedDischargeAt: at('2026-10-20T10:00:00.000Z'),
    dischargedAt: at('2026-10-20T10:00:00.000Z'),
  }),
  // Inpatients
  adm('i1', {
    bedId: 'b1',
    admittedAt: at('2026-10-21T06:00:00.000Z'),
    expectedDischargeAt: at('2026-10-21T14:00:00.000Z'),
  }),
  adm('i2', {
    status: 'DISCHARGE_ORDERED',
    bedId: 'b2',
    expectedDischargeAt: at('2026-10-21T12:00:00.000Z'),
    dischargeOrderedAt: at('2026-10-21T06:00:00.000Z'),
  }),
  adm('i3', {
    type: 'SCHEDULED',
    specialtyCode: 'MIN',
    bedId: 'b5',
    admittedAt: at('2026-10-21T07:30:00.000Z'),
    expectedDischargeAt: at('2026-10-22T08:00:00.000Z'),
  }),
  adm('i4', { specialtyCode: 'MIN', bedId: 'b6' }),
  adm('i5', {
    specialtyCode: 'MIN',
    bedId: 'b7',
    expectedDischargeAt: at('2026-10-20T10:00:00.000Z'),
  }),
  // Scheduled for today
  adm('s1', {
    type: 'SCHEDULED',
    status: 'SCHEDULED',
    admittedAt: undefined,
    scheduledFor: at('2026-10-21T12:00:00.000Z'),
  }),
  adm('s2', {
    type: 'SCHEDULED',
    status: 'AWAITING_BED',
    admittedAt: undefined,
    scheduledFor: at('2026-10-21T06:30:00.000Z'),
  }),
  adm('s3', {
    type: 'SCHEDULED',
    status: 'BED_ASSIGNED',
    admittedAt: undefined,
    scheduledFor: at('2026-10-21T08:00:00.000Z'),
    bedId: 'b3',
  }),
  adm('s4', {
    type: 'SCHEDULED',
    status: 'CANCELLED',
    admittedAt: undefined,
    scheduledFor: at('2026-10-21T07:00:00.000Z'),
  }),
  adm('s5', {
    type: 'SCHEDULED',
    admittedAt: at('2026-10-21T07:45:00.000Z'),
    scheduledFor: at('2026-10-21T07:30:00.000Z'),
    bedId: 'b4',
  }),
  adm('s6', {
    type: 'SCHEDULED',
    status: 'SCHEDULED',
    admittedAt: undefined,
    scheduledFor: at('2026-10-22T08:00:00.000Z'),
  }), // tomorrow
  adm('s7', {
    type: 'SCHEDULED',
    status: 'SCHEDULED',
    specialtyCode: 'MIN',
    admittedAt: undefined,
    scheduledFor: at('2026-10-21T13:00:00.000Z'),
  }),
  adm('u9', { status: 'CANCELLED', admittedAt: undefined }), // an urgent cancellation: not a scheduled one
]

const visit = (id: string, code: string): EdVisit => ({
  ...sampleEntities.edVisit,
  id,
  patientId: 'p-i1',
  phase: 'ADMIT_DECISION',
  targetSpecialtyCode: code,
})
const edVisits: EdVisit[] = [visit('v1', 'CAR'), visit('v2', 'MIN')]

const specialties: Specialty[] = [
  { ...sampleEntities.specialty, id: 'sp1', code: 'CAR', name: 'Cardiología' },
  { ...sampleEntities.specialty, id: 'sp2', code: 'MIN', name: 'Medicina Interna' },
]

let seq = 0
const cancelled = (
  entityId: string,
  occurredAt: string,
  reason: 'NO_BED' | 'PATIENT',
): HospitalEvent =>
  ({
    seq: ++seq,
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    type: 'AdmissionCancelled',
    occurredAt,
    actor: 'simulator',
    entityType: 'Admission',
    entityId,
    payload: { reason },
  }) as HospitalEvent
const events: HospitalEvent[] = [
  cancelled('s4', '2026-10-21T08:30:00.000Z', 'NO_BED'),
  cancelled('u9', '2026-10-21T08:40:00.000Z', 'NO_BED'), // urgent: not counted
  cancelled('s6', '2026-10-20T08:00:00.000Z', 'NO_BED'), // yesterday: not counted
]

export const admissionsInput: AdmissionsInput = {
  admissions,
  beds,
  units,
  patients,
  specialties,
  edVisits,
  events,
  now: ADM_NOW,
}

export const admissionsRows: Change[] = [
  {
    entity: 'simulationState',
    op: 'put',
    record: { ...sampleEntities.simulationState, simNow: ADM_NOW },
  },
  ...specialties.map((record): Change => ({ entity: 'specialty', op: 'put', record })),
  ...units.map((record): Change => ({ entity: 'unit', op: 'put', record })),
  ...beds.map((record): Change => ({ entity: 'bed', op: 'put', record })),
  ...patients.map((record): Change => ({ entity: 'patient', op: 'put', record })),
  ...edVisits.map((record): Change => ({ entity: 'edVisit', op: 'put', record })),
  ...admissions.map((record): Change => ({ entity: 'admission', op: 'put', record })),
]

/** Seeds the fixture; the cancel events go in the event log. */
export async function seedAdmissions(backend: DataBackend): Promise<void> {
  await backend.events.append(
    events.map(({ seq: _seq, ...event }) => event),
    admissionsRows,
  )
}
