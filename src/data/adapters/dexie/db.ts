import { Dexie, type Table } from 'dexie'
import type { EntityName, EntityOf, HospitalEvent } from '@/domain/schemas'

export const DATABASE_NAME = 'torre-control'

/** Current Dexie schema version. Bump with a new `db.version(n)` block — never edit an old one. */
export const SCHEMA_VERSION = 1

/** IndexedDB table per entity. */
export const TABLE_NAMES = {
  specialty: 'specialties',
  unit: 'units',
  bed: 'beds',
  patient: 'patients',
  edVisit: 'edVisits',
  admission: 'admissions',
  bedRequest: 'bedRequests',
  transferRequest: 'transferRequests',
  porter: 'porters',
  user: 'users',
  alert: 'alerts',
  simulationState: 'simulationState',
} as const satisfies Record<EntityName, string>

export const EVENTS_TABLE = 'events'

/** Version 1 store definitions (primary key first, then indexes used by dashboards). */
export const STORES_V1 = {
  specialties: 'id, &code',
  units: 'id, &code, type',
  beds: 'id, unitId, status, [unitId+status], patientId, admissionId',
  patients: 'id, &mrn',
  edVisits: 'id, patientId, phase, triageLevel, arrivedAt',
  admissions: 'id, patientId, status, type, specialtyCode, bedId, expectedDischargeAt',
  bedRequests: 'id, admissionId, status, priority',
  transferRequests: 'id, patientId, status, porterId, slaDueAt',
  porters: 'id, status, shift',
  users: 'id, &username, role',
  alerts: 'id, ruleId, severity, [entityType+entityId], resolvedAt',
  simulationState: 'id',
  // seq is assigned explicitly inside the append transaction (gap-free); ++ keeps it auto-capable.
  events: '++seq, &id, type, occurredAt, [entityType+entityId]',
} as const satisfies Record<(typeof TABLE_NAMES)[EntityName] | typeof EVENTS_TABLE, string>

export class TorreControlDb extends Dexie {
  constructor(name: string = DATABASE_NAME) {
    super(name)
    this.version(1).stores(STORES_V1)
  }

  entityTable<N extends EntityName>(name: N): Table<EntityOf<N>, string> {
    return this.table(TABLE_NAMES[name])
  }

  get events(): Table<HospitalEvent, number> {
    return this.table(EVENTS_TABLE)
  }
}
