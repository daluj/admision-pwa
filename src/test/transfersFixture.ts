import type { Change, DataBackend } from '@/data/ports'
import type { Patient, Porter, TransferRequest } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import type { TransfersInput } from '@/domain/kpis'

/** 12:00 in Madrid. */
export const TR_NOW = '2026-10-21T10:00:00.000Z'
const ago = (m: number) => new Date(Date.parse(TR_NOW) - m * 60_000).toISOString()
const inMin = (m: number) => new Date(Date.parse(TR_NOW) + m * 60_000).toISOString()

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
const patients: Patient[] = []
let n = 0
const patient = (id: string): string => {
  patients.push({
    ...sampleEntities.patient,
    id: `p-${id}`,
    mrn: `SIM-${id.toUpperCase()}`,
    firstName: FIRST[n++ % FIRST.length]!,
    lastName: 'García Ruiz',
  })
  return `p-${id}`
}

const porter = (id: string, name: string, status: Porter['status']): Porter => ({
  ...sampleEntities.porter,
  id,
  name,
  shift: 'MORNING',
  status,
})
/** 4 on duty (2 available, 2 busy) and 1 off shift. */
export const porters: Porter[] = [
  porter('por-a', 'Ana Celadora', 'AVAILABLE'),
  porter('por-b', 'Berto Celador', 'AVAILABLE'),
  porter('por-c', 'Carla Celadora', 'BUSY'),
  porter('por-d', 'Dani Celador', 'BUSY'),
  porter('por-z', 'Zoe Noche', 'OFF_SHIFT'),
]

const transfer = (id: string, extra: Partial<TransferRequest>): TransferRequest => ({
  ...sampleEntities.transferRequest,
  id,
  patientId: patient(id),
  fromLocation: { kind: 'ED', label: 'Urgencias' },
  // Not a BED: picking up must not need a real bed and admission behind it.
  toLocation: { kind: 'OTHER', label: `Planta 1 ${id}` },
  reason: 'ADMISSION',
  priority: 'NORMAL',
  requestedAt: ago(10),
  status: 'REQUESTED',
  slaDueAt: inMin(20),
  porterId: undefined,
  assignedAt: undefined,
  pickedUpAt: undefined,
  deliveredAt: undefined,
  ...extra,
})

/**
 * Open: t1 urgent unassigned (SLA overdue by 2 min), t2 normal unassigned (20 min left),
 * t3 urgent assigned to por-c (SLA in 3 min), t4 normal picked up by por-d.
 * Done today: t5 picked up in 8 min (within SLA), t6 in 25 min (SLA 10: late), t7 picked up in 5 min
 * (within), delivered; t8 picked up yesterday; t9 cancelled.
 */
export const transfers: TransferRequest[] = [
  transfer('t1', { priority: 'URGENT', requestedAt: ago(12), slaDueAt: ago(2) }),
  transfer('t2', { requestedAt: ago(10), slaDueAt: inMin(20) }),
  transfer('t3', {
    priority: 'URGENT',
    requestedAt: ago(7),
    slaDueAt: inMin(3),
    status: 'ASSIGNED',
    porterId: 'por-c',
    assignedAt: ago(5),
  }),
  transfer('t4', {
    requestedAt: ago(40),
    slaDueAt: ago(10),
    status: 'PICKED_UP',
    porterId: 'por-d',
    assignedAt: ago(35),
    pickedUpAt: ago(30),
    toLocation: { kind: 'RADIOLOGY', label: 'Radiología' },
    reason: 'TEST',
  }),
  transfer('t5', {
    requestedAt: ago(100),
    slaDueAt: ago(70),
    status: 'DELIVERED',
    porterId: 'por-a',
    assignedAt: ago(95),
    pickedUpAt: ago(92),
    deliveredAt: ago(80),
  }),
  transfer('t6', {
    priority: 'URGENT',
    requestedAt: ago(200),
    slaDueAt: ago(190),
    status: 'DELIVERED',
    porterId: 'por-a',
    assignedAt: ago(180),
    pickedUpAt: ago(175),
    deliveredAt: ago(160),
  }),
  transfer('t7', {
    requestedAt: ago(300),
    slaDueAt: ago(270),
    status: 'DELIVERED',
    porterId: 'por-b',
    assignedAt: ago(298),
    pickedUpAt: ago(295),
    deliveredAt: ago(280),
  }),
  transfer('t8', {
    requestedAt: '2026-10-20T10:00:00.000Z',
    slaDueAt: '2026-10-20T10:30:00.000Z',
    status: 'DELIVERED',
    porterId: 'por-a',
    pickedUpAt: '2026-10-20T10:05:00.000Z',
    deliveredAt: '2026-10-20T10:20:00.000Z',
  }),
  transfer('t9', { status: 'CANCELLED' }),
]

export const transfersInput: TransfersInput = { transfers, porters, patients, now: TR_NOW }

export const transferRows: Change[] = [
  {
    entity: 'simulationState',
    op: 'put',
    record: { ...sampleEntities.simulationState, simNow: TR_NOW },
  },
  ...porters.map((record): Change => ({ entity: 'porter', op: 'put', record })),
  ...patients.map((record): Change => ({ entity: 'patient', op: 'put', record })),
  ...transfers.map((record): Change => ({ entity: 'transferRequest', op: 'put', record })),
]

export async function seedTransfers(backend: DataBackend): Promise<void> {
  await backend.events.append([], transferRows)
}
