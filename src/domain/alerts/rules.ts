import {
  computeAdmissions,
  computeCensus,
  computeEd,
  computeTransfers,
  type Census,
  type Ed,
} from '@/domain/kpis'
import type {
  Admission,
  AlertParams,
  AlertSeverity,
  Bed,
  BedRequest,
  EdVisit,
  EntityType,
  Id,
  IsoDateTime,
  Patient,
  Porter,
  Specialty,
  TransferRequest,
  Unit,
} from '@/domain/schemas'
import type { AlertConfig } from './config'

export const ALERT_RULE_IDS = [
  'ED_TRIAGE_TARGET_BREACH',
  'BOARDING_LONG',
  'BED_PENDING_CLEANING_LONG',
  'TRANSFER_SLA_BREACH',
  'UNIT_FULL',
  'BED_BALANCE_NEGATIVE',
] as const
export type AlertRuleId = (typeof ALERT_RULE_IDS)[number]

export const ALERT_AREAS = ['emergency', 'beds', 'admissions', 'transfers'] as const
export type AlertArea = (typeof ALERT_AREAS)[number]

/** The dashboard each rule belongs to (its link and the area filter of the alert centre). */
export const ALERT_RULE_AREA: Record<AlertRuleId, AlertArea> = {
  ED_TRIAGE_TARGET_BREACH: 'emergency',
  BOARDING_LONG: 'emergency',
  BED_PENDING_CLEANING_LONG: 'beds',
  UNIT_FULL: 'beds',
  BED_BALANCE_NEGATIVE: 'admissions',
  TRANSFER_SLA_BREACH: 'transfers',
}

/** Short English text kept on the alert; the UI builds the Spanish one from `ruleId` + `params`. */
const MESSAGES: Record<AlertRuleId, string> = {
  ED_TRIAGE_TARGET_BREACH: 'Patient waiting for a physician beyond the triage target',
  BOARDING_LONG: 'Patient boarding in the ED for too long',
  BED_PENDING_CLEANING_LONG: 'Bed pending cleaning for too long',
  TRANSFER_SLA_BREACH: 'Transfer not picked up by its SLA',
  UNIT_FULL: 'Unit full with open bed requests',
  BED_BALANCE_NEGATIVE: 'Forecast bed balance is negative',
}

export type AlertCandidate = {
  /** `ruleId:entityId`: the identity of an alert while it is open. */
  key: string
  ruleId: AlertRuleId
  severity: Exclude<AlertSeverity, 'INFO'>
  entityType: EntityType
  entityId: Id
  message: string
  /** Static facts only (initials, level, unit…): the alert text does not change while it is open. */
  params: AlertParams
}

export type AlertInput = {
  edVisits: readonly EdVisit[]
  admissions: readonly Admission[]
  bedRequests: readonly BedRequest[]
  beds: readonly Bed[]
  units: readonly Unit[]
  patients: readonly Patient[]
  specialties: readonly Specialty[]
  transfers: readonly TransferRequest[]
  porters: readonly Porter[]
  now: IsoDateTime
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const candidate = (
  ruleId: AlertRuleId,
  entityType: EntityType,
  entityId: Id,
  severity: AlertCandidate['severity'],
  params: AlertParams,
): AlertCandidate => ({
  key: `${ruleId}:${entityId}`,
  ruleId,
  severity,
  entityType,
  entityId,
  message: MESSAGES[ruleId],
  params,
})

/** `BOARDING_LONG`: every boarder over the warn / critical hours (strictly over). */
function boardingLong(ed: Ed, config: AlertConfig): AlertCandidate[] {
  const out: AlertCandidate[] = []
  for (const row of ed.boarding) {
    const ms = row.sinceDecisionMs
    const severity =
      ms > config.boardingLongCriticalHours * HOUR
        ? 'CRITICAL'
        : ms > config.boardingLongWarnHours * HOUR
          ? 'WARNING'
          : null
    if (severity) {
      out.push(
        candidate('BOARDING_LONG', 'EdVisit', row.visit.id, severity, { initials: row.initials }),
      )
    }
  }
  return out
}

/** `ED_TRIAGE_TARGET_BREACH`: waiting for a physician past the Manchester target; L1–2 are critical. */
function triageBreach(ed: Ed): AlertCandidate[] {
  return ed.exceptions.flatMap((e) =>
    e.kind === 'triageBreach'
      ? [
          candidate(
            'ED_TRIAGE_TARGET_BREACH',
            'EdVisit',
            e.id.replace(/^triage:/, ''),
            e.level <= 2 ? 'CRITICAL' : 'WARNING',
            { initials: e.initials, level: e.level, targetMin: e.targetMin },
          ),
        ]
      : [],
  )
}

/** `BED_PENDING_CLEANING_LONG`: a bed that has waited for cleaning past the warn / critical minutes. */
function pendingCleaning(
  beds: readonly Bed[],
  units: readonly Unit[],
  now: IsoDateTime,
  config: AlertConfig,
): AlertCandidate[] {
  const unitById = new Map(units.map((u) => [u.id, u]))
  const nowMs = Date.parse(now)
  const out: AlertCandidate[] = []
  for (const bed of beds) {
    if (bed.status !== 'PENDING_CLEANING') continue
    const ms = nowMs - Date.parse(bed.statusChangedAt)
    const severity =
      ms > config.pendingCleaningCriticalMin * MINUTE
        ? 'CRITICAL'
        : ms > config.pendingCleaningWarnMin * MINUTE
          ? 'WARNING'
          : null
    if (!severity) continue
    const unit = unitById.get(bed.unitId)
    out.push(
      candidate('BED_PENDING_CLEANING_LONG', 'Bed', bed.id, severity, {
        bedLabel: bed.label,
        unitName: unit?.name ?? '',
        unitId: bed.unitId,
      }),
    )
  }
  return out
}

/** `UNIT_FULL`: no operational bed left in the unit and open bed requests for its specialty and type. */
function unitFull(census: Census, requests: readonly BedRequest[]): AlertCandidate[] {
  const open = requests.filter((r) => r.status === 'OPEN')
  const out: AlertCandidate[] = []
  for (const { unit, kpis } of census.units) {
    if (kpis.counts.operational === 0 || kpis.occupancy < 1) continue
    const waiting = open.filter(
      (r) =>
        r.requiredUnitType === unit.type && unit.specialtyCodes.includes(r.preferredSpecialtyCode),
    ).length
    if (waiting === 0) continue
    out.push(
      candidate('UNIT_FULL', 'Unit', unit.id, 'WARNING', {
        unitName: unit.name,
        unitId: unit.id,
        requests: waiting,
      }),
    )
  }
  return out
}

/** `BED_BALANCE_NEGATIVE`: forecast below 0 is a warning, below the configured value critical. */
export function balanceCandidates(value: number, config: AlertConfig): AlertCandidate[] {
  if (value >= 0) return []
  return [
    candidate(
      'BED_BALANCE_NEGATIVE',
      'SimulationState',
      'current',
      value < config.balanceCritical ? 'CRITICAL' : 'WARNING',
      { value },
    ),
  ]
}

/** `TRANSFER_SLA_BREACH`: not picked up past `slaDueAt` (the transfers board's own exceptions). */
function transferSla(input: AlertInput): AlertCandidate[] {
  const transfers = computeTransfers({
    transfers: input.transfers,
    porters: input.porters,
    patients: input.patients,
    now: input.now,
  })
  return transfers.exceptions.map((e) =>
    candidate(
      'TRANSFER_SLA_BREACH',
      'TransferRequest',
      e.id.replace(/^sla:/, ''),
      e.priority === 'URGENT' ? 'CRITICAL' : 'WARNING',
      { initials: e.initials, to: e.toLabel },
    ),
  )
}

/**
 * Everything that is wrong right now, according to `specs/domain.md` → Alert Rules, as a pure
 * function of the data, the simulated `now` and the thresholds. Reuses the dashboards' own
 * calculators so alerts and "Necesita atención" lists cannot disagree.
 */
export function alertCandidates(input: AlertInput, config: AlertConfig): AlertCandidate[] {
  const { now } = input
  const ed = computeEd({
    edVisits: input.edVisits,
    admissions: input.admissions,
    bedRequests: input.bedRequests,
    beds: input.beds,
    units: input.units,
    patients: input.patients,
    specialties: input.specialties,
    now,
  })
  const census = computeCensus({
    beds: input.beds,
    units: input.units,
    admissions: input.admissions,
    patients: input.patients,
    now,
  })
  const admissions = computeAdmissions({
    admissions: input.admissions,
    beds: input.beds,
    units: input.units,
    patients: input.patients,
    specialties: input.specialties,
    edVisits: input.edVisits,
    events: [],
    now,
  })
  return [
    ...triageBreach(ed),
    ...boardingLong(ed, config),
    ...pendingCleaning(input.beds, input.units, now, config),
    ...transferSla(input),
    ...unitFull(census, input.bedRequests),
    ...balanceCandidates(admissions.balance.value, config),
  ]
}
