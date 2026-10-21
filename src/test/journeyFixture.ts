import type { Change, DataBackend } from '@/data/ports'
import type {
  Admission,
  Bed,
  BedRequest,
  EdVisit,
  HospitalEvent,
  Patient,
  TransferRequest,
  Unit,
} from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import type { JourneyData } from '@/domain/kpis'

/** 12:00 in Madrid. */
export const JR_NOW = '2026-10-21T10:00:00.000Z'

export const units: Unit[] = [
  {
    ...sampleEntities.unit,
    id: 'u1',
    code: 'CAR-5N',
    name: 'Cardiología 5ª Norte',
    specialtyCodes: ['CAR'],
  },
  {
    ...sampleEntities.unit,
    id: 'u2',
    code: 'MIN-6N',
    name: 'Medicina Interna 6ª Norte',
    specialtyCodes: ['MIN'],
  },
]
const bed = (id: string, unitId: string): Bed => ({
  ...sampleEntities.bed,
  id,
  unitId,
  label: id.toUpperCase(),
  statusChangedAt: JR_NOW,
})
export const beds: Bed[] = [bed('b1', 'u1'), bed('b3', 'u1'), bed('b5', 'u2')]

export const patients: Patient[] = []
const patient = (id: string, firstName: string, lastName: string, birthYear = 1960): string => {
  patients.push({
    ...sampleEntities.patient,
    id: `p-${id}`,
    mrn: `SIM-${id.toUpperCase().padStart(4, '0')}`,
    firstName,
    lastName,
    birthYear,
    updatedAt: '2026-01-01T00:00:00.000Z',
  })
  return `p-${id}`
}

export const edVisits: EdVisit[] = []
const visit = (id: string, pid: string, extra: Partial<EdVisit>): EdVisit => {
  const v: EdVisit = {
    ...sampleEntities.edVisit,
    id,
    patientId: pid,
    area: 'BOXES',
    chiefComplaint: 'Dolor torácico',
    triageLevel: undefined,
    triagedAt: undefined,
    seenAt: undefined,
    admitDecisionAt: undefined,
    endedAt: undefined,
    outcome: undefined,
    targetSpecialtyCode: undefined,
    updatedAt: extra.arrivedAt ?? JR_NOW,
    ...extra,
  } as EdVisit
  edVisits.push(v)
  return v
}

export const admissions: Admission[] = []
const admission = (id: string, pid: string, extra: Partial<Admission>): Admission => {
  const a: Admission = {
    ...sampleEntities.admission,
    id,
    patientId: pid,
    type: 'URGENT',
    specialtyCode: 'CAR',
    scheduledFor: undefined,
    admittedAt: undefined,
    bedId: undefined,
    expectedDischargeAt: undefined,
    dischargeOrderedAt: undefined,
    dischargedAt: undefined,
    edVisitId: undefined,
    updatedAt:
      extra.dischargedAt ??
      extra.dischargeOrderedAt ??
      extra.admittedAt ??
      '2026-10-21T08:00:00.000Z',
    ...extra,
  } as Admission
  admissions.push(a)
  return a
}

export const bedRequests: BedRequest[] = []
const request = (id: string, admissionId: string, extra: Partial<BedRequest>): void => {
  bedRequests.push({
    ...sampleEntities.bedRequest,
    id,
    admissionId,
    priority: 'P2',
    status: 'OPEN',
    assignedBedId: undefined,
    etaAt: undefined,
    ...extra,
  } as BedRequest)
}

export const transfers: TransferRequest[] = []
const transfer = (id: string, pid: string, extra: Partial<TransferRequest>): void => {
  transfers.push({
    ...sampleEntities.transferRequest,
    id,
    patientId: pid,
    reason: 'ADMISSION',
    priority: 'NORMAL',
    status: 'REQUESTED',
    porterId: undefined,
    assignedAt: undefined,
    pickedUpAt: undefined,
    deliveredAt: undefined,
    ...extra,
  } as TransferRequest)
}

export const events: HospitalEvent[] = []
let seq = 0
const event = (
  type: string,
  entityType: string,
  entityId: string,
  occurredAt: string,
  payload: object,
) =>
  events.push({
    seq: ++seq,
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    type,
    occurredAt,
    actor: 'simulator',
    entityType,
    entityId,
    payload,
  } as HospitalEvent)

// a — Ana Ruiz Mora: just arrived, waiting for triage (20 min ago).
const pa = patient('a', 'Ana', 'Ruiz Mora', 1985)
visit('va', pa, { arrivedAt: '2026-10-21T09:40:00.000Z', phase: 'ARRIVED', area: 'WAITING_ROOM' })

// b — Boris Lara Vega: admit decision, no bed yet.
const pb = patient('b', 'Boris', 'Lara Vega', 1950)
visit('vb', pb, {
  arrivedAt: '2026-10-21T06:00:00.000Z',
  triagedAt: '2026-10-21T06:10:00.000Z',
  triageLevel: 3,
  seenAt: '2026-10-21T06:40:00.000Z',
  admitDecisionAt: '2026-10-21T08:00:00.000Z',
  phase: 'ADMIT_DECISION',
  targetSpecialtyCode: 'CAR',
})
admission('ab', pb, { status: 'AWAITING_BED', edVisitId: 'vb' })
request('rb', 'ab', { requestedAt: '2026-10-21T08:00:00.000Z' })

// c — Clara Soto Gil: bed reserved (ETA 10:30), transfer requested and not picked up yet.
const pc = patient('c', 'Clara', 'Soto Gil', 1972)
visit('vc', pc, {
  arrivedAt: '2026-10-21T05:00:00.000Z',
  triagedAt: '2026-10-21T05:10:00.000Z',
  triageLevel: 2,
  seenAt: '2026-10-21T05:30:00.000Z',
  admitDecisionAt: '2026-10-21T06:00:00.000Z',
  phase: 'ADMIT_DECISION',
})
admission('ac', pc, { status: 'BED_ASSIGNED', edVisitId: 'vc', bedId: 'b3' })
request('rc', 'ac', {
  requestedAt: '2026-10-21T06:00:00.000Z',
  status: 'ASSIGNED',
  assignedBedId: 'b3',
  etaAt: '2026-10-21T10:30:00.000Z',
})
event('BedReserved', 'Bed', 'b3', '2026-10-21T09:30:00.000Z', {
  bedRequestId: 'rc',
  admissionId: 'ac',
})
transfer('tc', pc, {
  requestedAt: '2026-10-21T09:30:00.000Z',
  slaDueAt: '2026-10-21T10:00:00.000Z',
  toLocation: { kind: 'BED', refId: 'b3', label: 'Cardiología 5ª Norte B3' },
  fromLocation: { kind: 'ED', label: 'Urgencias' },
})

// d — Daniel Pons Ruiz: admitted since 01:00, discharge expected tomorrow.
const pd = patient('d', 'Daniel', 'Pons Ruiz', 1941)
visit('vd', pd, {
  arrivedAt: '2026-10-20T20:00:00.000Z',
  triagedAt: '2026-10-20T20:15:00.000Z',
  triageLevel: 3,
  seenAt: '2026-10-20T21:00:00.000Z',
  admitDecisionAt: '2026-10-20T23:00:00.000Z',
  endedAt: '2026-10-21T00:35:00.000Z',
  outcome: 'ADMITTED',
  phase: 'LEFT_ED',
})
admission('ad', pd, {
  status: 'ADMITTED',
  edVisitId: 'vd',
  bedId: 'b1',
  admittedAt: '2026-10-21T01:00:00.000Z',
  expectedDischargeAt: '2026-10-22T09:00:00.000Z',
})
request('rd', 'ad', {
  requestedAt: '2026-10-20T23:00:00.000Z',
  status: 'FULFILLED',
  assignedBedId: 'b1',
})
event('BedReserved', 'Bed', 'b1', '2026-10-21T00:10:00.000Z', {
  bedRequestId: 'rd',
  admissionId: 'ad',
})
transfer('td', pd, {
  requestedAt: '2026-10-21T00:10:00.000Z',
  slaDueAt: '2026-10-21T00:40:00.000Z',
  pickedUpAt: '2026-10-21T00:30:00.000Z',
  deliveredAt: '2026-10-21T00:50:00.000Z',
  status: 'DELIVERED',
  toLocation: { kind: 'BED', refId: 'b1', label: 'Cardiología 5ª Norte B1' },
  fromLocation: { kind: 'ED', label: 'Urgencias' },
})

// e — Elena Gil Pardo: scheduled stay, already discharged this morning.
const pe = patient('e', 'Elena', 'Gil Pardo', 1990)
admission('ae', pe, {
  type: 'SCHEDULED',
  specialtyCode: 'MIN',
  status: 'DISCHARGED',
  scheduledFor: '2026-10-19T09:00:00.000Z',
  admittedAt: '2026-10-19T10:00:00.000Z',
  bedId: 'b5',
  dischargeOrderedAt: '2026-10-21T07:00:00.000Z',
  dischargedAt: '2026-10-21T09:00:00.000Z',
})
request('re', 'ae', {
  requestedAt: '2026-10-19T09:00:00.000Z',
  status: 'FULFILLED',
  assignedBedId: 'b5',
})

// f — Félix Mora Sanz: scheduled for 14:00 today, not arrived.
const pf = patient('f', 'Félix', 'Mora Sanz', 1968)
admission('af', pf, {
  type: 'SCHEDULED',
  status: 'SCHEDULED',
  scheduledFor: '2026-10-21T14:00:00.000Z',
})

// g — Gema Nieto Cruz: scheduled admission cancelled for lack of a bed.
const pg = patient('g', 'Gema', 'Nieto Cruz', 1979)
admission('ag', pg, {
  type: 'SCHEDULED',
  status: 'CANCELLED',
  scheduledFor: '2026-10-21T08:00:00.000Z',
  updatedAt: '2026-10-21T08:30:00.000Z',
})
request('rg', 'ag', { requestedAt: '2026-10-21T07:50:00.000Z', status: 'CANCELLED' })
event('AdmissionCancelled', 'Admission', 'ag', '2026-10-21T08:30:00.000Z', { reason: 'NO_BED' })

// h — Hugo Ibáñez Roca: ED visit that ended at home.
const ph = patient('h', 'Hugo', 'Ibáñez Roca', 2001)
visit('vh', ph, {
  arrivedAt: '2026-10-21T07:00:00.000Z',
  triagedAt: '2026-10-21T07:10:00.000Z',
  triageLevel: 4,
  seenAt: '2026-10-21T07:50:00.000Z',
  endedAt: '2026-10-21T08:40:00.000Z',
  outcome: 'DISCHARGED_HOME',
  phase: 'LEFT_ED',
})

// i — Inés Núñez Gil: registered, no episode at all.
patient('i', 'Inés', 'Núñez Gil', 1999)

// j — Jorge Vidal Sanz: an older ED visit (home) and a current admission in Medicina Interna.
const pj = patient('j', 'Jorge', 'Vidal Sanz', 1955)
visit('vj-old', pj, {
  arrivedAt: '2026-10-10T10:00:00.000Z',
  triagedAt: '2026-10-10T10:20:00.000Z',
  triageLevel: 4,
  seenAt: '2026-10-10T11:00:00.000Z',
  endedAt: '2026-10-10T12:00:00.000Z',
  outcome: 'DISCHARGED_HOME',
  phase: 'LEFT_ED',
})
admission('aj', pj, {
  specialtyCode: 'MIN',
  type: 'SCHEDULED',
  status: 'ADMITTED',
  scheduledFor: '2026-10-20T09:00:00.000Z',
  admittedAt: '2026-10-20T10:00:00.000Z',
  bedId: 'b5',
})

export const journeyData: JourneyData = {
  patients,
  edVisits,
  admissions,
  bedRequests,
  transfers,
  beds,
  units,
  events,
  now: JR_NOW,
}

const rows: Change[] = [
  {
    entity: 'simulationState',
    op: 'put',
    record: { ...sampleEntities.simulationState, simNow: JR_NOW },
  },
  ...units.map((record): Change => ({ entity: 'unit', op: 'put', record })),
  ...beds.map((record): Change => ({ entity: 'bed', op: 'put', record })),
  ...patients.map((record): Change => ({ entity: 'patient', op: 'put', record })),
  ...edVisits.map((record): Change => ({ entity: 'edVisit', op: 'put', record })),
  ...admissions.map((record): Change => ({ entity: 'admission', op: 'put', record })),
  ...bedRequests.map((record): Change => ({ entity: 'bedRequest', op: 'put', record })),
  ...transfers.map((record): Change => ({ entity: 'transferRequest', op: 'put', record })),
]

export async function seedJourney(backend: DataBackend): Promise<void> {
  await backend.events.append(
    events.map(({ seq: _seq, ...e }) => e),
    rows,
  )
}
