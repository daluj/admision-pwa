import type {
  Admission,
  Bed,
  BedRequest,
  EdArea,
  EdVisit,
  IsoDateTime,
  Patient,
  Specialty,
  TriageLevel,
  Unit,
  UnitType,
} from '@/domain/schemas'
import { patientInitials } from './initials'
import { ED_THRESHOLDS } from './thresholds'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Phases that have a column on the board. */
export const BOARD_PHASES = ['ARRIVED', 'TRIAGED', 'IN_ASSESSMENT', 'ADMIT_DECISION'] as const
export type BoardPhase = (typeof BOARD_PHASES)[number]

export type EdCard = {
  visit: EdVisit
  level?: TriageLevel
  initials: string
  /** Shown only in the tooltip. */
  fullName: string
  mrn: string
  area: EdArea
  chiefComplaint: string
  /** Time in the current phase. */
  waitMs: number
  /** Manchester target (TRIAGED patients only). */
  targetMs?: number
  /** TRIAGED and waiting longer than the target. */
  overTarget: boolean
}

export type EdColumns = Record<BoardPhase, EdCard[]>

export type BoardingState =
  | { kind: 'NO_BED' }
  | { kind: 'RESERVED'; bedLabel: string; unitName: string }
  | { kind: 'IN_TRANSFER'; bedLabel: string; unitName: string }

export type BoardingRow = {
  visit: EdVisit
  level?: TriageLevel
  initials: string
  specialtyName: string
  unitType: UnitType
  isolationRequired: boolean
  sinceDecisionMs: number
  state: BoardingState
}

export type EdKpis = {
  present: number
  inWaitingRoom: number
  inBoxes: number
  waitingTriage: number
  oldestTriageWaitMs: number | null
  waitingPhysician: number
  overTarget: number
  /** Over target and Manchester level 1–2. */
  overTargetUrgent: number
  boarding: number
  /** Boarding patients that already have a bed (reserved or on the way). */
  boardingWithBed: number
  longestBoardingMs: number | null
  boardingOverFourHours: number
  /** L2–L5 patients seen in the last 24 h, and how many within target. */
  seen24h: number
  within24h: number
  withinPct: number | null
}

export type HourBucket = {
  /** Start of the clock hour (ISO UTC). */
  start: IsoDateTime
  seen: number
  within: number
  /** Share within target; `null` when nobody was seen that hour. */
  pct: number | null
}

export type EdException =
  | {
      id: string
      kind: 'triageBreach'
      severity: 'critical' | 'warn'
      initials: string
      level: TriageLevel
      waitMs: number
      targetMin: number
      ageMs: number
    }
  | {
      id: string
      kind: 'boardingLong'
      severity: 'critical' | 'warn'
      initials: string
      ageMs: number
    }

export type Ed = {
  kpis: EdKpis
  columns: EdColumns
  boarding: BoardingRow[]
  exceptions: EdException[]
  /** 24 buckets, oldest first; the last one is the current clock hour. */
  hourly: HourBucket[]
}

export type EdInput = {
  edVisits: readonly EdVisit[]
  admissions: readonly Admission[]
  bedRequests: readonly BedRequest[]
  beds: readonly Bed[]
  units: readonly Unit[]
  patients: readonly Patient[]
  specialties: readonly Specialty[]
  now: IsoDateTime
}

const targetMsOf = (level: TriageLevel) => ED_THRESHOLDS.physicianTargetMinutes[level] * MINUTE

/** Wait of a seen patient: triage → physician. */
const waitToPhysician = (visit: EdVisit): number | null =>
  visit.seenAt && visit.triagedAt ? Date.parse(visit.seenAt) - Date.parse(visit.triagedAt) : null

const phaseStart = (visit: EdVisit): string => {
  switch (visit.phase) {
    case 'TRIAGED':
      return visit.triagedAt ?? visit.arrivedAt
    case 'IN_ASSESSMENT':
      return visit.seenAt ?? visit.triagedAt ?? visit.arrivedAt
    case 'ADMIT_DECISION':
      return visit.admitDecisionAt ?? visit.seenAt ?? visit.arrivedAt
    default:
      return visit.arrivedAt
  }
}

const EXCEPTION_ORDER = { critical: 0, warn: 1 } as const

/**
 * Everything the Urgencias dashboard shows (`specs/domain.md` → KPIs → Emergency Department),
 * as a pure function of the data and the simulated `now`.
 */
export function computeEd(input: EdInput): Ed {
  const { edVisits, admissions, bedRequests, beds, units, patients, specialties, now } = input
  const nowMs = Date.parse(now)
  const patientById = new Map(patients.map((p) => [p.id, p]))
  const bedById = new Map(beds.map((b) => [b.id, b]))
  const unitById = new Map(units.map((u) => [u.id, u]))
  const nameByCode = new Map(specialties.map((s) => [s.code, s.name]))

  const columns: EdColumns = { ARRIVED: [], TRIAGED: [], IN_ASSESSMENT: [], ADMIT_DECISION: [] }
  let present = 0
  let inWaitingRoom = 0

  for (const visit of edVisits) {
    if (visit.phase === 'LEFT_ED') continue
    present++
    if (visit.area === 'WAITING_ROOM') inWaitingRoom++
    const patient = patientById.get(visit.patientId)
    const waitMs = Math.max(0, nowMs - Date.parse(phaseStart(visit)))
    const targetMs =
      visit.phase === 'TRIAGED' && visit.triageLevel ? targetMsOf(visit.triageLevel) : undefined
    columns[visit.phase as BoardPhase].push({
      visit,
      ...(visit.triageLevel ? { level: visit.triageLevel } : {}),
      initials: patient ? patientInitials(patient) : '—',
      fullName: patient ? `${patient.firstName} ${patient.lastName}` : '',
      mrn: patient?.mrn ?? '',
      area: visit.area,
      chiefComplaint: visit.chiefComplaint,
      waitMs,
      ...(targetMs !== undefined ? { targetMs } : {}),
      overTarget: targetMs !== undefined && waitMs > targetMs,
    })
  }

  // Triage level first (1 → 5), unknown level last; then the longest wait.
  for (const phase of BOARD_PHASES) {
    columns[phase].sort(
      (a, b) =>
        (a.level ?? 9) - (b.level ?? 9) ||
        b.waitMs - a.waitMs ||
        a.visit.id.localeCompare(b.visit.id),
    )
  }

  const boarding = boardingRows(columns.ADMIT_DECISION, {
    admissions,
    bedRequests,
    bedById,
    unitById,
    nameByCode,
  })

  // Seen in the last 24 h (L2–L5): the % tile and the chart.
  const since = nowMs - 24 * HOUR
  const seen = edVisits.flatMap((visit) => {
    const wait = waitToPhysician(visit)
    if (wait === null || !visit.seenAt || !visit.triageLevel || visit.triageLevel === 1) return []
    return [{ seenAtMs: Date.parse(visit.seenAt), within: wait <= targetMsOf(visit.triageLevel) }]
  })
  const recent = seen.filter((s) => s.seenAtMs >= since && s.seenAtMs <= nowMs)
  const within24h = recent.filter((s) => s.within).length

  const hourStart = Math.floor(nowMs / HOUR) * HOUR
  const hourly: HourBucket[] = Array.from({ length: 24 }, (_, i) => {
    const start = hourStart - (23 - i) * HOUR
    const inHour = seen.filter((s) => s.seenAtMs >= start && s.seenAtMs < start + HOUR)
    const within = inHour.filter((s) => s.within).length
    return {
      start: new Date(start).toISOString(),
      seen: inHour.length,
      within,
      pct: inHour.length === 0 ? null : within / inHour.length,
    }
  })

  const triaged = columns.TRIAGED
  const arrived = columns.ARRIVED
  const boardingMs = columns.ADMIT_DECISION.map((c) => c.waitMs)
  const kpis: EdKpis = {
    present,
    inWaitingRoom,
    inBoxes: present - inWaitingRoom,
    waitingTriage: arrived.length,
    oldestTriageWaitMs: arrived.length ? Math.max(...arrived.map((c) => c.waitMs)) : null,
    waitingPhysician: triaged.length,
    overTarget: triaged.filter((c) => c.overTarget).length,
    overTargetUrgent: triaged.filter((c) => c.overTarget && (c.level ?? 5) <= 2).length,
    boarding: boarding.length,
    boardingWithBed: boarding.filter((r) => r.state.kind !== 'NO_BED').length,
    longestBoardingMs: boardingMs.length ? Math.max(...boardingMs) : null,
    boardingOverFourHours: boardingMs.filter(
      (ms) => ms > ED_THRESHOLDS.boardingLongWarnMin * MINUTE,
    ).length,
    seen24h: recent.length,
    within24h,
    withinPct: recent.length === 0 ? null : within24h / recent.length,
  }

  const exceptions: EdException[] = []
  for (const card of triaged) {
    if (!card.overTarget || card.level === undefined || card.targetMs === undefined) continue
    exceptions.push({
      id: `triage:${card.visit.id}`,
      kind: 'triageBreach',
      severity: card.level <= 2 ? 'critical' : 'warn',
      initials: card.initials,
      level: card.level,
      waitMs: card.waitMs,
      targetMin: card.targetMs / MINUTE,
      ageMs: card.waitMs,
    })
  }
  for (const row of boarding) {
    if (row.sinceDecisionMs <= ED_THRESHOLDS.boardingLongWarnMin * MINUTE) continue
    exceptions.push({
      id: `boarding:${row.visit.id}`,
      kind: 'boardingLong',
      severity:
        row.sinceDecisionMs > ED_THRESHOLDS.boardingLongCriticalMin * MINUTE ? 'critical' : 'warn',
      initials: row.initials,
      ageMs: row.sinceDecisionMs,
    })
  }
  exceptions.sort(
    (a, b) => EXCEPTION_ORDER[a.severity] - EXCEPTION_ORDER[b.severity] || b.ageMs - a.ageMs,
  )

  return { kpis, columns, boarding, exceptions, hourly }
}

function boardingRows(
  cards: readonly EdCard[],
  ctx: {
    admissions: readonly Admission[]
    bedRequests: readonly BedRequest[]
    bedById: ReadonlyMap<string, Bed>
    unitById: ReadonlyMap<string, Unit>
    nameByCode: ReadonlyMap<string, string>
  },
): BoardingRow[] {
  const admissionByVisit = new Map<string, Admission>()
  for (const admission of ctx.admissions) {
    if (admission.edVisitId) admissionByVisit.set(admission.edVisitId, admission)
  }
  const requestByAdmission = new Map<string, BedRequest>()
  for (const request of ctx.bedRequests) {
    if (request.status === 'OPEN' || request.status === 'ASSIGNED') {
      requestByAdmission.set(request.admissionId, request)
    }
  }

  const rows = cards.map((card): BoardingRow => {
    const { visit } = card
    const admission = admissionByVisit.get(visit.id)
    const request = admission ? requestByAdmission.get(admission.id) : undefined
    const code =
      request?.preferredSpecialtyCode ?? visit.targetSpecialtyCode ?? admission?.specialtyCode ?? ''
    const bedId = request?.assignedBedId ?? admission?.bedId
    const bed = bedId ? ctx.bedById.get(bedId) : undefined
    const unit = bed ? ctx.unitById.get(bed.unitId) : undefined

    // BED_ASSIGNED = reserved; IN_TRANSFER (or just admitted, about to leave the ED) = on the way.
    let state: BoardingState = { kind: 'NO_BED' }
    if (bed && admission) {
      const where = { bedLabel: bed.label, unitName: unit?.name ?? '' }
      if (admission.status === 'BED_ASSIGNED') state = { kind: 'RESERVED', ...where }
      else if (admission.status === 'IN_TRANSFER' || admission.status === 'ADMITTED') {
        state = { kind: 'IN_TRANSFER', ...where }
      }
    }
    return {
      visit,
      ...(card.level ? { level: card.level } : {}),
      initials: card.initials,
      specialtyName: ctx.nameByCode.get(code) ?? code,
      unitType: request?.requiredUnitType ?? 'WARD',
      isolationRequired: request?.isolationRequired ?? false,
      sinceDecisionMs: card.waitMs,
      state,
    }
  })
  return rows.sort(
    (a, b) => b.sinceDecisionMs - a.sinceDecisionMs || a.visit.id.localeCompare(b.visit.id),
  )
}
