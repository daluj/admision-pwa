import type { Change, DataBackend } from '@/data/ports'
import type { AlertInput } from '@/domain/alerts'
import type { Bed, BedRequest, Unit } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { ED_NOW, edInput } from './edFixture'
import { porters, transfers, transfersInput } from './transfersFixture'

/** 12:00 in Madrid (both fixtures share it). */
export const ALERT_NOW = ED_NOW
const ago = (minutes: number) => new Date(Date.parse(ALERT_NOW) - minutes * 60_000).toISOString()

const bed = (id: string, unitId: string, status: Bed['status'], since: string): Bed => ({
  ...sampleEntities.bed,
  id,
  label: id.toUpperCase(),
  unitId,
  status,
  statusChangedAt: since,
})

const fullUnit: Unit = {
  ...sampleEntities.unit,
  id: 'u9',
  code: 'MIN-9N',
  name: 'Medicina Interna 9ª Norte',
  type: 'WARD',
  specialtyCodes: ['MIN'],
}

/**
 * Everything wrong at 12:00, by rule (see the matching assertions in `rules.test.ts`):
 * - ED triage breach: v3 (L2) and v6 (L1) critical, v5 (L4) warning.
 * - Boarding long: v8 (5 h) warning, v9 (9 h) critical; v10 (1 h) fine.
 * - Pending cleaning: bc1 61 min warning, bc2 exactly 60 min fine, bc3 121 min critical.
 * - Transfer SLA: t1 (urgent, 2 min late) critical.
 * - Unit full: u9 has its only bed occupied and r9 asks for Medicina Interna / WARD.
 */
export const alertInput: AlertInput = {
  edVisits: edInput.edVisits,
  admissions: edInput.admissions,
  bedRequests: edInput.bedRequests,
  beds: [
    ...edInput.beds,
    bed('bc1', 'u1', 'PENDING_CLEANING', ago(61)),
    bed('bc2', 'u1', 'PENDING_CLEANING', ago(60)),
    bed('bc3', 'u1', 'PENDING_CLEANING', ago(121)),
    bed('bf1', 'u9', 'OCCUPIED', ago(2000)),
  ],
  units: [...edInput.units, fullUnit],
  patients: [...edInput.patients, ...transfersInput.patients],
  specialties: edInput.specialties,
  transfers,
  porters,
  now: ALERT_NOW,
}

export async function seedAlerts(backend: DataBackend, extra: Change[] = []): Promise<void> {
  const rows: Change[] = [
    {
      entity: 'simulationState',
      op: 'put',
      record: { ...sampleEntities.simulationState, simNow: ALERT_NOW },
    },
    ...alertInput.specialties.map((record): Change => ({ entity: 'specialty', op: 'put', record })),
    ...alertInput.units.map((record): Change => ({ entity: 'unit', op: 'put', record })),
    ...alertInput.beds.map((record): Change => ({ entity: 'bed', op: 'put', record })),
    ...alertInput.patients.map((record): Change => ({ entity: 'patient', op: 'put', record })),
    ...alertInput.edVisits.map((record): Change => ({ entity: 'edVisit', op: 'put', record })),
    ...alertInput.admissions.map((record): Change => ({ entity: 'admission', op: 'put', record })),
    ...alertInput.bedRequests.map((record): Change => ({
      entity: 'bedRequest',
      op: 'put',
      record,
    })),
    ...alertInput.transfers.map((record): Change => ({
      entity: 'transferRequest',
      op: 'put',
      record,
    })),
    ...alertInput.porters.map((record): Change => ({ entity: 'porter', op: 'put', record })),
    ...extra,
  ]
  await backend.events.append([], rows)
}

export type { BedRequest }
