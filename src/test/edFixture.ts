import type { Change, DataBackend } from '@/data/ports'
import type {
  Admission,
  Bed,
  BedRequest,
  EdVisit,
  Patient,
  TriageLevel,
  Unit,
} from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import type { EdInput } from '@/domain/kpis'

/** 12:00 in Madrid. */
export const ED_NOW = '2026-10-21T10:00:00.000Z'
const ago = (minutes: number) => new Date(Date.parse(ED_NOW) - minutes * 60_000).toISOString()

const patients: Patient[] = []
let n = 0
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
]
const visit = (id: string, extra: Partial<EdVisit>): EdVisit => {
  const i = n++
  patients.push({
    ...sampleEntities.patient,
    id: `p-${id}`,
    mrn: `SIM-${id.toUpperCase()}`,
    firstName: FIRST[i % FIRST.length]!,
    lastName: 'García Ruiz',
  })
  return {
    ...sampleEntities.edVisit,
    id,
    patientId: `p-${id}`,
    arrivedAt: ago(600),
    phase: 'ARRIVED',
    area: 'BOXES',
    chiefComplaint: 'Disnea',
    ...extra,
  }
}
const lvl = (l: TriageLevel) => ({ triageLevel: l })

/**
 * Urgencias at 12:00: 2 arrived (12 and 40 min ago), 4 triaged (L2 25 min — over target, L3 30 min,
 * L4 130 min — over target, L1 1 min — over), 1 in assessment, 3 boarding (9 h without bed,
 * 5 h with bed 512-A reserved, 1 h in transfer to 513-B) and 3 gone (2 seen within target).
 */
export const edVisits: EdVisit[] = [
  visit('v1', { arrivedAt: ago(12), area: 'WAITING_ROOM' }),
  visit('v2', { arrivedAt: ago(40), chiefComplaint: 'Fiebre sin foco' }),
  visit('v3', { phase: 'TRIAGED', ...lvl(2), triagedAt: ago(25) }),
  visit('v4', { phase: 'TRIAGED', ...lvl(3), triagedAt: ago(30), area: 'WAITING_ROOM' }),
  visit('v5', { phase: 'TRIAGED', ...lvl(4), triagedAt: ago(130) }),
  visit('v6', { phase: 'TRIAGED', ...lvl(1), triagedAt: ago(1), area: 'RESUS' }),
  visit('v7', { phase: 'IN_ASSESSMENT', ...lvl(3), triagedAt: ago(90), seenAt: ago(20) }),
  visit('v8', {
    phase: 'ADMIT_DECISION',
    ...lvl(3),
    triagedAt: ago(480),
    seenAt: ago(420),
    admitDecisionAt: ago(300),
    targetSpecialtyCode: 'CAR',
  }),
  visit('v9', {
    phase: 'ADMIT_DECISION',
    ...lvl(2),
    triagedAt: ago(600),
    seenAt: ago(585),
    admitDecisionAt: ago(540),
    targetSpecialtyCode: 'MIN',
  }),
  visit('v10', {
    phase: 'ADMIT_DECISION',
    ...lvl(4),
    triagedAt: ago(180),
    seenAt: ago(160),
    admitDecisionAt: ago(60),
    targetSpecialtyCode: 'NML',
  }),
  visit('v11', {
    phase: 'LEFT_ED',
    ...lvl(3),
    triagedAt: ago(240),
    seenAt: ago(180),
    endedAt: ago(100),
    outcome: 'DISCHARGED_HOME',
  }),
  visit('v12', {
    phase: 'LEFT_ED',
    ...lvl(4),
    triagedAt: ago(200),
    seenAt: ago(150),
    endedAt: ago(90),
    outcome: 'DISCHARGED_HOME',
  }),
  visit('v13', {
    phase: 'LEFT_ED',
    ...lvl(3),
    triagedAt: ago(300),
    seenAt: ago(200),
    endedAt: ago(100),
    outcome: 'DISCHARGED_HOME',
  }),
]

const unit: Unit = {
  ...sampleEntities.unit,
  id: 'u1',
  code: 'CAR-5N',
  name: 'Cardiología 5ª Norte',
  type: 'WARD',
}
const bed = (id: string, label: string): Bed => ({ ...sampleEntities.bed, id, label, unitId: 'u1' })
const adm = (id: string, edVisitId: string, extra: Partial<Admission>): Admission => ({
  ...sampleEntities.admission,
  id,
  edVisitId,
  patientId: `p-${edVisitId}`,
  status: 'AWAITING_BED',
  ...extra,
})
const req = (id: string, admissionId: string, extra: Partial<BedRequest>): BedRequest => ({
  ...sampleEntities.bedRequest,
  id,
  admissionId,
  status: 'OPEN',
  requiredUnitType: 'WARD',
  isolationRequired: false,
  ...extra,
})

export const edInput: EdInput = {
  edVisits,
  admissions: [
    adm('a8', 'v8', { status: 'BED_ASSIGNED', bedId: 'b1' }),
    adm('a9', 'v9', {}),
    adm('a10', 'v10', { status: 'IN_TRANSFER', bedId: 'b2' }),
  ],
  bedRequests: [
    req('r8', 'a8', { status: 'ASSIGNED', assignedBedId: 'b1', preferredSpecialtyCode: 'CAR' }),
    req('r9', 'a9', { preferredSpecialtyCode: 'MIN', isolationRequired: true }),
    req('r10', 'a10', { status: 'ASSIGNED', assignedBedId: 'b2', preferredSpecialtyCode: 'NML' }),
  ],
  beds: [bed('b1', '512-A'), bed('b2', '513-B')],
  units: [unit],
  patients,
  specialties: [
    { ...sampleEntities.specialty, id: 's1', code: 'CAR', name: 'Cardiología' },
    { ...sampleEntities.specialty, id: 's2', code: 'MIN', name: 'Medicina Interna' },
    { ...sampleEntities.specialty, id: 's3', code: 'NML', name: 'Neumología' },
  ],
  now: ED_NOW,
}

export const edRows: Change[] = [
  {
    entity: 'simulationState',
    op: 'put',
    record: { ...sampleEntities.simulationState, simNow: ED_NOW },
  },
  ...edInput.specialties.map((record): Change => ({ entity: 'specialty', op: 'put', record })),
  ...edInput.units.map((record): Change => ({ entity: 'unit', op: 'put', record })),
  ...edInput.beds.map((record): Change => ({ entity: 'bed', op: 'put', record })),
  ...edInput.patients.map((record): Change => ({ entity: 'patient', op: 'put', record })),
  ...edInput.edVisits.map((record): Change => ({ entity: 'edVisit', op: 'put', record })),
  ...edInput.admissions.map((record): Change => ({ entity: 'admission', op: 'put', record })),
  ...edInput.bedRequests.map((record): Change => ({ entity: 'bedRequest', op: 'put', record })),
]

export async function seedEd(backend: DataBackend): Promise<void> {
  await backend.events.append([], edRows)
}
