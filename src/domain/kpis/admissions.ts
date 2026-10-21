import type {
  Admission,
  AdmissionCancelReason,
  Bed,
  EdVisit,
  HospitalEvent,
  IsoDateTime,
  Patient,
  Specialty,
  Unit,
} from '@/domain/schemas'
import { HOSPITAL_TIME_ZONE, zonedClock } from '@/lib/time'
import { patientInitials } from './initials'
import { ADMISSION_THRESHOLDS } from './thresholds'

const MINUTE = 60_000
const IN_BED = ['ADMITTED', 'DISCHARGE_ORDERED']

/** Limits the view to a nurse supervisor's unit: its units and the specialties it treats. */
export type AdmissionScope = {
  unitIds: ReadonlySet<string>
  specialtyCodes: ReadonlySet<string>
}

export type AdmissionsInput = {
  admissions: readonly Admission[]
  beds: readonly Bed[]
  units: readonly Unit[]
  patients: readonly Patient[]
  specialties: readonly Specialty[]
  edVisits: readonly EdVisit[]
  /** Any order; used for cancel reasons. */
  events: readonly HospitalEvent[]
  now: IsoDateTime
  scope?: AdmissionScope
}

export type ScheduleStatus = 'PENDING' | 'ARRIVED' | 'BED_RESERVED' | 'ADMITTED' | 'CANCELLED'

export type ScheduledRow = {
  admission: Admission
  initials: string
  specialtyName: string
  scheduledFor: IsoDateTime
  status: ScheduleStatus
  cancelReason?: AdmissionCancelReason
  /** Time since the scheduled time (negative = still to come). */
  sinceMs: number
}

export type BalanceForecast = {
  availableBeds: number
  expectedRemaining: number
  boarding: number
  scheduledPending: number
  value: number
}

export type UnitDischarges = {
  unit: Unit
  expectedToday: number
  doneToday: number
  /** Expected today and still in bed. */
  pending: number
  /** Discharge orders issued and not yet carried out. */
  ordered: number
  doneBeforeNoon: number
  pctBeforeNoon: number | null
}

export type WorklistTab = 'today' | 'ordered' | 'upcoming' | 'none'

export type WorklistRow = {
  admission: Admission
  bed: Bed
  unit: Unit
  initials: string
  specialtyName: string
  /** Stay so far, ms. */
  losMs: number
  expectedDischargeAt?: IsoDateTime
  ordered: boolean
  /** Expected earlier than today and the patient is still here. */
  overdue: boolean
  tab: WorklistTab
}

export type AdmissionsException =
  | { id: string; kind: 'balanceDeficit'; severity: 'critical' | 'warn'; value: number; ageMs: 0 }
  | {
      id: string
      kind: 'scheduledLate'
      severity: 'critical' | 'warn'
      initials: string
      sinceMs: number
      ageMs: number
    }
  | {
      id: string
      kind: 'dischargeStuck'
      severity: 'warn'
      initials: string
      bedLabel: string
      sinceMs: number
      ageMs: number
    }

export type AdmissionsKpis = {
  admittedToday: number
  admittedUrgent: number
  admittedScheduled: number
  scheduledPending: number
  scheduledArrived: number
  expectedToday: number
  dischargedToday: number
  dischargedBeforeNoon: number
  /** Completed today before 12:00 ÷ completed today; `null` when none completed. */
  pctBeforeNoon: number | null
  cancelledNoBed: number
}

export type Admissions = {
  kpis: AdmissionsKpis
  scheduled: ScheduledRow[]
  balance: BalanceForecast
  byUnit: UnitDischarges[]
  totals: UnitDischarges | null
  worklist: WorklistRow[]
  exceptions: AdmissionsException[]
}

const SEVERITY = { critical: 0, warn: 1 } as const

export function scheduleStatus(admission: Admission): ScheduleStatus {
  switch (admission.status) {
    case 'CANCELLED':
      return 'CANCELLED'
    case 'SCHEDULED':
      return 'PENDING'
    case 'AWAITING_BED':
      return 'ARRIVED'
    case 'BED_ASSIGNED':
    case 'IN_TRANSFER':
      return 'BED_RESERVED'
    default:
      return 'ADMITTED'
  }
}

/** Everything the Ingresos y altas page shows, as a pure function of the data and the simulated `now`. */
export function computeAdmissions(input: AdmissionsInput): Admissions {
  const { admissions, beds, units, patients, specialties, edVisits, events, now, scope } = input
  const nowMs = Date.parse(now)
  const today = zonedClock(now, HOSPITAL_TIME_ZONE).date
  const dateOf = (iso: string) => zonedClock(iso, HOSPITAL_TIME_ZONE).date
  const minuteOf = (iso: string) => zonedClock(iso, HOSPITAL_TIME_ZONE).minuteOfDay

  const bedById = new Map(beds.map((b) => [b.id, b]))
  const unitById = new Map(units.map((u) => [u.id, u]))
  const patientById = new Map(patients.map((p) => [p.id, p]))
  const nameByCode = new Map(specialties.map((s) => [s.code, s.name]))
  const admissionById = new Map(admissions.map((a) => [a.id, a]))

  const inUnitScope = (unitId: string | undefined) =>
    !scope || (unitId !== undefined && scope.unitIds.has(unitId))
  const inSpecialtyScope = (code: string) => !scope || scope.specialtyCodes.has(code)
  const unitOfAdmission = (a: Admission) => (a.bedId ? bedById.get(a.bedId)?.unitId : undefined)
  /** Hospital view counts every admission; a scoped view only those in the scope's units. */
  const admissionInScope = (a: Admission) => !scope || inUnitScope(unitOfAdmission(a))

  // Cancel reasons live in the events.
  const cancelReason = new Map<string, { reason: AdmissionCancelReason; at: string }>()
  for (const event of events) {
    if (event.type === 'AdmissionCancelled') {
      cancelReason.set(event.entityId, { reason: event.payload.reason, at: event.occurredAt })
    }
  }

  // --- Scheduled admissions of the day
  const scheduled: ScheduledRow[] = []
  for (const admission of admissions) {
    if (admission.type !== 'SCHEDULED' || !admission.scheduledFor) continue
    if (dateOf(admission.scheduledFor) !== today || !inSpecialtyScope(admission.specialtyCode))
      continue
    const patient = patientById.get(admission.patientId)
    const reason = cancelReason.get(admission.id)?.reason
    scheduled.push({
      admission,
      initials: patient ? patientInitials(patient) : '—',
      specialtyName: nameByCode.get(admission.specialtyCode) ?? admission.specialtyCode,
      scheduledFor: admission.scheduledFor,
      status: scheduleStatus(admission),
      ...(reason ? { cancelReason: reason } : {}),
      sinceMs: nowMs - Date.parse(admission.scheduledFor),
    })
  }
  scheduled.sort(
    (a, b) =>
      a.scheduledFor.localeCompare(b.scheduledFor) || a.admission.id.localeCompare(b.admission.id),
  )
  const scheduledPending = scheduled.filter((r) => r.status === 'PENDING').length
  const scheduledArrived = scheduled.filter(
    (r) => r.status === 'ARRIVED' || r.status === 'BED_RESERVED',
  ).length

  // Cancelled for lack of a bed today (scheduled admissions, in scope).
  let cancelledNoBed = 0
  for (const event of events) {
    if (event.type !== 'AdmissionCancelled' || event.payload.reason !== 'NO_BED') continue
    if (dateOf(event.occurredAt) !== today) continue
    const admission = admissionById.get(event.entityId)
    if (admission?.type === 'SCHEDULED' && inSpecialtyScope(admission.specialtyCode))
      cancelledNoBed++
  }

  // --- Admissions and discharges today
  let admittedUrgent = 0
  let admittedScheduled = 0
  let expectedToday = 0
  let dischargedToday = 0
  let dischargedBeforeNoon = 0
  const perUnit = new Map<string, UnitDischarges>()
  const unitRow = (unit: Unit): UnitDischarges => {
    let row = perUnit.get(unit.id)
    if (!row) {
      row = {
        unit,
        expectedToday: 0,
        doneToday: 0,
        pending: 0,
        ordered: 0,
        doneBeforeNoon: 0,
        pctBeforeNoon: null,
      }
      perUnit.set(unit.id, row)
    }
    return row
  }

  for (const admission of admissions) {
    if (!admissionInScope(admission)) continue
    if (admission.admittedAt && dateOf(admission.admittedAt) === today) {
      if (admission.type === 'URGENT') admittedUrgent++
      else admittedScheduled++
    }
    const unit = unitById.get(unitOfAdmission(admission) ?? '')
    const discharged = admission.status === 'DISCHARGED'
    const expected =
      (IN_BED.includes(admission.status) || discharged) &&
      admission.expectedDischargeAt !== undefined &&
      dateOf(admission.expectedDischargeAt) === today
    const done =
      discharged && admission.dischargedAt !== undefined && dateOf(admission.dischargedAt) === today
    const beforeNoon =
      done && minuteOf(admission.dischargedAt!) < ADMISSION_THRESHOLDS.noonMinuteOfDay

    if (expected) expectedToday++
    if (done) dischargedToday++
    if (beforeNoon) dischargedBeforeNoon++
    if (unit) {
      const row = unitRow(unit)
      if (expected) row.expectedToday++
      if (done) row.doneToday++
      if (beforeNoon) row.doneBeforeNoon++
      if (expected && IN_BED.includes(admission.status)) row.pending++
      if (admission.status === 'DISCHARGE_ORDERED') row.ordered++
    }
  }

  const byUnit = [...perUnit.values()]
    .map((row) => ({
      ...row,
      pctBeforeNoon: row.doneToday === 0 ? null : row.doneBeforeNoon / row.doneToday,
    }))
    .filter((row) => row.expectedToday + row.doneToday + row.ordered > 0)
    .sort(
      (a, b) =>
        b.pending - a.pending ||
        a.unit.building.localeCompare(b.unit.building, 'es') ||
        a.unit.floor - b.unit.floor ||
        a.unit.name.localeCompare(b.unit.name, 'es'),
    )
  const totals: UnitDischarges | null = byUnit.length
    ? byUnit.reduce<UnitDischarges>(
        (acc, row) => ({
          ...acc,
          expectedToday: acc.expectedToday + row.expectedToday,
          doneToday: acc.doneToday + row.doneToday,
          pending: acc.pending + row.pending,
          ordered: acc.ordered + row.ordered,
          doneBeforeNoon: acc.doneBeforeNoon + row.doneBeforeNoon,
          pctBeforeNoon: null,
        }),
        {
          ...byUnit[0]!,
          expectedToday: 0,
          doneToday: 0,
          pending: 0,
          ordered: 0,
          doneBeforeNoon: 0,
        },
      )
    : null
  if (totals) {
    totals.pctBeforeNoon = totals.doneToday === 0 ? null : totals.doneBeforeNoon / totals.doneToday
  }

  // --- Bed balance forecast
  const scopedBeds = beds.filter((b) => inUnitScope(b.unitId))
  const pendingDischarges = admissions.filter(
    (a) =>
      admissionInScope(a) &&
      IN_BED.includes(a.status) &&
      a.expectedDischargeAt !== undefined &&
      dateOf(a.expectedDischargeAt) === today,
  ).length
  const admissionByVisit = new Map<string, Admission>()
  for (const admission of admissions) {
    if (admission.edVisitId && admission.status !== 'CANCELLED')
      admissionByVisit.set(admission.edVisitId, admission)
  }
  // Boarders that already hold a reserved bed are not counted again: that bed is no longer free.
  const boarding = edVisits.filter((visit) => {
    if (visit.phase !== 'ADMIT_DECISION') return false
    const admission = admissionByVisit.get(visit.id)
    if (admission && ['BED_ASSIGNED', 'IN_TRANSFER', 'ADMITTED'].includes(admission.status))
      return false
    const code = visit.targetSpecialtyCode ?? admission?.specialtyCode
    return !scope || (code !== undefined && scope.specialtyCodes.has(code))
  }).length
  const availableBeds = scopedBeds.filter((b) => b.status === 'AVAILABLE').length
  const balance: BalanceForecast = {
    availableBeds,
    expectedRemaining: pendingDischarges,
    boarding,
    scheduledPending,
    value: availableBeds + pendingDischarges - (boarding + scheduledPending),
  }

  // --- Discharge worklist: inpatients in scope
  const worklist: WorklistRow[] = []
  const dayNumber = (date: string) => {
    const [y, m, d] = date.split('-').map(Number)
    return Date.UTC(y!, m! - 1, d!)
  }
  for (const admission of admissions) {
    if (!IN_BED.includes(admission.status) || !admission.bedId) continue
    const bed = bedById.get(admission.bedId)
    const unit = bed ? unitById.get(bed.unitId) : undefined
    if (!bed || !unit || !inUnitScope(unit.id)) continue
    const patient = patientById.get(admission.patientId)
    const ordered = admission.status === 'DISCHARGE_ORDERED'
    const expected = admission.expectedDischargeAt
    const expectedDay = expected ? dayNumber(dateOf(expected)) : undefined
    const todayDay = dayNumber(today)
    const overdue = !ordered && expectedDay !== undefined && expectedDay < todayDay
    let tab: WorklistTab
    if (ordered) tab = 'ordered'
    else if (expectedDay === undefined) tab = 'none'
    else if (expectedDay <= todayDay) tab = 'today'
    else tab = 'upcoming'
    worklist.push({
      admission,
      bed,
      unit,
      initials: patient ? patientInitials(patient) : '—',
      specialtyName: nameByCode.get(admission.specialtyCode) ?? admission.specialtyCode,
      losMs: admission.admittedAt ? Math.max(0, nowMs - Date.parse(admission.admittedAt)) : 0,
      ...(expected ? { expectedDischargeAt: expected } : {}),
      ordered,
      overdue,
      tab,
    })
  }
  worklist.sort(
    (a, b) =>
      (a.expectedDischargeAt ?? '9999').localeCompare(b.expectedDischargeAt ?? '9999') ||
      a.unit.code.localeCompare(b.unit.code) ||
      a.bed.label.localeCompare(b.bed.label, 'es', { numeric: true }),
  )

  // --- Exceptions
  const exceptions: AdmissionsException[] = []
  if (balance.value < 0) {
    exceptions.push({
      id: 'balance',
      kind: 'balanceDeficit',
      severity: balance.value < ADMISSION_THRESHOLDS.balanceCritical ? 'critical' : 'warn',
      value: balance.value,
      ageMs: 0,
    })
  }
  for (const row of scheduled) {
    if (row.status !== 'ARRIVED' && row.status !== 'BED_RESERVED') continue
    if (row.sinceMs <= ADMISSION_THRESHOLDS.scheduledLateWarnMin * MINUTE) continue
    exceptions.push({
      id: `scheduled:${row.admission.id}`,
      kind: 'scheduledLate',
      severity:
        row.sinceMs > ADMISSION_THRESHOLDS.scheduledLateCriticalMin * MINUTE ? 'critical' : 'warn',
      initials: row.initials,
      sinceMs: row.sinceMs,
      ageMs: row.sinceMs,
    })
  }
  for (const row of worklist) {
    const orderedAt = row.admission.dischargeOrderedAt
    if (!row.ordered || !orderedAt) continue
    const sinceMs = nowMs - Date.parse(orderedAt)
    if (sinceMs <= ADMISSION_THRESHOLDS.orderedStuckMin * MINUTE) continue
    exceptions.push({
      id: `stuck:${row.admission.id}`,
      kind: 'dischargeStuck',
      severity: 'warn',
      initials: row.initials,
      bedLabel: row.bed.label,
      sinceMs,
      ageMs: sinceMs,
    })
  }
  exceptions.sort((a, b) => SEVERITY[a.severity] - SEVERITY[b.severity] || b.ageMs - a.ageMs)

  return {
    kpis: {
      admittedToday: admittedUrgent + admittedScheduled,
      admittedUrgent,
      admittedScheduled,
      scheduledPending,
      scheduledArrived,
      expectedToday,
      dischargedToday,
      dischargedBeforeNoon,
      pctBeforeNoon: dischargedToday === 0 ? null : dischargedBeforeNoon / dischargedToday,
      cancelledNoBed,
    },
    scheduled,
    balance,
    byUnit,
    totals,
    worklist,
    exceptions,
  }
}

/** Rows of one worklist tab. */
export const worklistTab = (rows: readonly WorklistRow[], tab: WorklistTab): WorklistRow[] =>
  rows.filter((row) => row.tab === tab)
