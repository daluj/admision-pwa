import type {
  Admission,
  AdmissionCancelReason,
  Bed,
  BedRequest,
  EdArea,
  EdOutcome,
  EdVisit,
  HospitalEvent,
  Id,
  IsoDateTime,
  Patient,
  TransferRequest,
  TriageLevel,
  Unit,
} from '@/domain/schemas'
import { HOSPITAL_TIME_ZONE, zonedClock } from '@/lib/time'
import { patientInitials } from './initials'

export const JOURNEY_SEARCH_LIMIT = 20
export const JOURNEY_MIN_QUERY = 2
/** Same window as the other dashboards that read events (enough for a simulated day). */
export const JOURNEY_EVENT_WINDOW = 5000

export type JourneyData = {
  patients: readonly Patient[]
  edVisits: readonly EdVisit[]
  admissions: readonly Admission[]
  bedRequests: readonly BedRequest[]
  transfers: readonly TransferRequest[]
  beds: readonly Bed[]
  units: readonly Unit[]
  /** Only used for the bed-reserved time and the cancel reason. */
  events: readonly HospitalEvent[]
  now: IsoDateTime
}

export type JourneyStepKind =
  | 'EdArrived'
  | 'Triaged'
  | 'Assessed'
  | 'Disposition'
  | 'AdmitDecision'
  | 'EdLeft'
  | 'Scheduled'
  | 'BedRequested'
  | 'BedReserved'
  | 'TransferRequested'
  | 'TransferPickedUp'
  | 'TransferDelivered'
  | 'Admitted'
  | 'ExpectedDischarge'
  | 'DischargeOrdered'
  | 'Discharged'
  | 'Cancelled'

export type JourneyStep = {
  id: string
  kind: JourneyStepKind
  state: 'done' | 'current' | 'upcoming'
  /** When it happened (done steps). A reserved bed without a known event time has none. */
  at?: IsoDateTime
  /** When it is planned or due (`scheduledFor`, `etaAt`, `slaDueAt`, `expectedDischargeAt`). */
  expectedAt?: IsoDateTime
  /** Time since the previous done step (done steps) or since the last done step (current step). */
  sinceMs?: number
  triageLevel?: TriageLevel
  outcome?: EdOutcome
  cancelReason?: AdmissionCancelReason
  /** "Unit bed" for steps that name one. */
  bedLabel?: string
}

export type JourneyLocation =
  | { kind: 'ED'; area: EdArea }
  | { kind: 'BED'; label: string }
  | { kind: 'TRANSFER'; label?: string }
  | { kind: 'NONE' }

export type JourneyStatus =
  | 'ED_ARRIVED'
  | 'ED_TRIAGED'
  | 'ED_IN_ASSESSMENT'
  | 'ED_BOARDING'
  | 'BED_RESERVED'
  | 'SCHEDULED'
  | 'AWAITING_BED'
  | 'IN_TRANSFER'
  | 'ADMITTED'
  | 'DISCHARGE_ORDERED'
  | 'DISCHARGED'
  | 'CANCELLED'
  | 'ED_LEFT'

export type JourneyEpisode = {
  id: string
  kind: 'ADMISSION' | 'ED'
  startedAt: IsoDateTime
  /** Still going: not discharged, cancelled or left. */
  active: boolean
  status: JourneyStatus
  location: JourneyLocation
  /** Time in the current status (since the last done step). */
  sinceMs?: number
  steps: JourneyStep[]
  /** The first step that has not happened yet, with its expected time when the data has one. */
  next?: JourneyStep
  outcome?: EdOutcome
  /** Bed label for admission episodes that had one. */
  bedLabel?: string
}

export type Journey = {
  patient: Patient
  initials: string
  ageYears: number
  /** Newest first; the first one is the active episode if any. */
  episodes: JourneyEpisode[]
}

/** Lower-case, accent-free, for matching. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-ES').trim()
}

type Lookups = {
  bedById: Map<Id, Bed>
  unitById: Map<Id, Unit>
  edByPatient: Map<Id, EdVisit[]>
  admissionsByPatient: Map<Id, Admission[]>
  requestByAdmission: Map<Id, BedRequest>
  transfersByPatient: Map<Id, TransferRequest[]>
  reservedAt: Map<Id, IsoDateTime>
  cancelReason: Map<Id, AdmissionCancelReason>
}

function group<T>(items: readonly T[], key: (item: T) => Id): Map<Id, T[]> {
  const map = new Map<Id, T[]>()
  for (const item of items) {
    const list = map.get(key(item))
    if (list) list.push(item)
    else map.set(key(item), [item])
  }
  return map
}

function lookups(data: JourneyData): Lookups {
  const requestByAdmission = new Map<Id, BedRequest>()
  // Latest request wins (a released reservation reopens the request, but keep the newest anyway).
  for (const r of data.bedRequests) {
    const seen = requestByAdmission.get(r.admissionId)
    if (!seen || r.requestedAt > seen.requestedAt) requestByAdmission.set(r.admissionId, r)
  }
  const reservedAt = new Map<Id, IsoDateTime>()
  const cancelReason = new Map<Id, AdmissionCancelReason>()
  // Events are in ascending order: the latest reservation overwrites earlier (released) ones.
  for (const e of data.events) {
    const payload = e.payload as Record<string, unknown>
    if (e.type === 'BedReserved' && typeof payload.admissionId === 'string') {
      reservedAt.set(payload.admissionId, e.occurredAt)
    } else if (e.type === 'AdmissionCancelled' && typeof payload.reason === 'string') {
      cancelReason.set(e.entityId, payload.reason as AdmissionCancelReason)
    }
  }
  return {
    bedById: new Map(data.beds.map((b) => [b.id, b])),
    unitById: new Map(data.units.map((u) => [u.id, u])),
    edByPatient: group(data.edVisits, (v) => v.patientId),
    admissionsByPatient: group(data.admissions, (a) => a.patientId),
    requestByAdmission,
    transfersByPatient: group(data.transfers, (t) => t.patientId),
    reservedAt,
    cancelReason,
  }
}

const bedLabelOf = (lk: Lookups, bedId: Id | undefined): string | undefined => {
  const bed = bedId ? lk.bedById.get(bedId) : undefined
  if (!bed) return undefined
  const unit = lk.unitById.get(bed.unitId)
  return `${unit?.name ?? ''} ${bed.label}`.trim()
}

type Draft = Omit<JourneyStep, 'state' | 'sinceMs'> & { done: boolean }

function edDrafts(visit: EdVisit, hasAdmission: boolean): Draft[] {
  const open = visit.phase !== 'LEFT_ED'
  const steps: Draft[] = [
    { id: `${visit.id}:arrived`, kind: 'EdArrived', at: visit.arrivedAt, done: true },
  ]
  steps.push(
    visit.triagedAt
      ? {
          id: `${visit.id}:triaged`,
          kind: 'Triaged',
          at: visit.triagedAt,
          ...(visit.triageLevel ? { triageLevel: visit.triageLevel } : {}),
          done: true,
        }
      : { id: `${visit.id}:triaged`, kind: 'Triaged', done: false },
  )
  if (visit.seenAt || open) {
    steps.push(
      visit.seenAt
        ? { id: `${visit.id}:assessed`, kind: 'Assessed', at: visit.seenAt, done: true }
        : { id: `${visit.id}:assessed`, kind: 'Assessed', done: false },
    )
  }
  if (visit.admitDecisionAt) {
    steps.push({
      id: `${visit.id}:decision`,
      kind: 'AdmitDecision',
      at: visit.admitDecisionAt,
      done: true,
    })
  } else if (open) {
    steps.push({ id: `${visit.id}:disposition`, kind: 'Disposition', done: false })
  }
  if (visit.endedAt) {
    steps.push({
      id: `${visit.id}:left`,
      kind: 'EdLeft',
      at: visit.endedAt,
      ...(visit.outcome ? { outcome: visit.outcome } : {}),
      done: true,
    })
  } else if (open && hasAdmission) {
    // The patient leaves the ED when the transfer to the ward starts or the bed is ready; no ETA.
    steps.push({ id: `${visit.id}:left`, kind: 'EdLeft', done: false })
  }
  return steps
}

function admissionDrafts(admission: Admission, lk: Lookups, transfers: TransferRequest[]): Draft[] {
  const id = admission.id
  const status = admission.status
  const steps: Draft[] = []
  if (status === 'CANCELLED') {
    const request = lk.requestByAdmission.get(id)
    if (admission.scheduledFor) {
      steps.push({
        id: `${id}:scheduled`,
        kind: 'Scheduled',
        at: admission.scheduledFor,
        done: true,
      })
    }
    if (request) {
      steps.push({
        id: `${id}:requested`,
        kind: 'BedRequested',
        at: request.requestedAt,
        done: true,
      })
    }
    const reason = lk.cancelReason.get(id)
    steps.push({
      id: `${id}:cancelled`,
      kind: 'Cancelled',
      at: admission.updatedAt,
      ...(reason ? { cancelReason: reason } : {}),
      done: true,
    })
    return steps
  }

  if (admission.type === 'SCHEDULED' && admission.scheduledFor) {
    steps.push({
      id: `${id}:scheduled`,
      kind: 'Scheduled',
      ...(status === 'SCHEDULED'
        ? { expectedAt: admission.scheduledFor, done: false }
        : { at: admission.scheduledFor, done: true }),
    })
  }

  const request = lk.requestByAdmission.get(id)
  steps.push(
    request
      ? { id: `${id}:requested`, kind: 'BedRequested', at: request.requestedAt, done: true }
      : { id: `${id}:requested`, kind: 'BedRequested', done: false },
  )

  const reserved = request?.status === 'ASSIGNED' || request?.status === 'FULFILLED'
  const reservedBed = bedLabelOf(lk, request?.assignedBedId ?? admission.bedId)
  const reservedAt = lk.reservedAt.get(id)
  steps.push({
    id: `${id}:reserved`,
    kind: 'BedReserved',
    ...(reserved && reservedAt ? { at: reservedAt } : {}),
    ...(reservedBed && reserved ? { bedLabel: reservedBed } : {}),
    // Without the event the reservation is known to have happened but not when.
    done: reserved,
  })

  // The admission transfer: the newest non-cancelled one towards this admission's bed.
  const transfer = transfers
    .filter(
      (t) =>
        t.reason === 'ADMISSION' &&
        t.status !== 'CANCELLED' &&
        (!admission.bedId || t.toLocation.refId === admission.bedId) &&
        t.requestedAt >= (request?.requestedAt ?? ''),
    )
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0]
  if (transfer) {
    steps.push({
      id: `${transfer.id}:requested`,
      kind: 'TransferRequested',
      at: transfer.requestedAt,
      done: true,
    })
    steps.push(
      transfer.pickedUpAt
        ? {
            id: `${transfer.id}:pickedUp`,
            kind: 'TransferPickedUp',
            at: transfer.pickedUpAt,
            done: true,
          }
        : {
            id: `${transfer.id}:pickedUp`,
            kind: 'TransferPickedUp',
            expectedAt: transfer.slaDueAt,
            done: false,
          },
    )
    steps.push(
      transfer.deliveredAt
        ? {
            id: `${transfer.id}:delivered`,
            kind: 'TransferDelivered',
            at: transfer.deliveredAt,
            done: true,
          }
        : { id: `${transfer.id}:delivered`, kind: 'TransferDelivered', done: false },
    )
  }

  const bedLabel = bedLabelOf(lk, admission.bedId)
  steps.push(
    admission.admittedAt
      ? {
          id: `${id}:admitted`,
          kind: 'Admitted',
          at: admission.admittedAt,
          ...(bedLabel ? { bedLabel } : {}),
          done: true,
        }
      : {
          id: `${id}:admitted`,
          kind: 'Admitted',
          ...(request?.etaAt && reserved ? { expectedAt: request.etaAt } : {}),
          done: false,
        },
  )

  if (admission.admittedAt && status !== 'DISCHARGED') {
    if (admission.expectedDischargeAt && !admission.dischargeOrderedAt) {
      steps.push({
        id: `${id}:expected`,
        kind: 'ExpectedDischarge',
        expectedAt: admission.expectedDischargeAt,
        done: false,
      })
    }
    steps.push(
      admission.dischargeOrderedAt
        ? {
            id: `${id}:ordered`,
            kind: 'DischargeOrdered',
            at: admission.dischargeOrderedAt,
            done: true,
          }
        : { id: `${id}:ordered`, kind: 'DischargeOrdered', done: false },
    )
  } else if (status === 'DISCHARGED' && admission.dischargeOrderedAt) {
    steps.push({
      id: `${id}:ordered`,
      kind: 'DischargeOrdered',
      at: admission.dischargeOrderedAt,
      done: true,
    })
  }
  if (admission.admittedAt) {
    steps.push(
      admission.dischargedAt
        ? { id: `${id}:discharged`, kind: 'Discharged', at: admission.dischargedAt, done: true }
        : { id: `${id}:discharged`, kind: 'Discharged', done: false },
    )
  }
  return steps
}

function finishSteps(
  drafts: Draft[],
  now: IsoDateTime,
): { steps: JourneyStep[]; next?: JourneyStep } {
  const nowMs = Date.parse(now)
  // Done steps in time order (canonical order breaks ties); the pending ones follow in canonical order.
  // A done step without a time (a reservation whose event is gone) sorts with the step before it.
  let carried = ''
  const done = drafts
    .map((d, index) => {
      if (d.done && d.at) carried = d.at
      return { d, index, key: d.at ?? carried }
    })
    .filter(({ d }) => d.done)
    .sort((a, b) => a.key.localeCompare(b.key) || a.index - b.index)
    .map(({ d }) => d)
  const pending = drafts.filter((d) => !d.done)

  const steps: JourneyStep[] = []
  let previousAt: IsoDateTime | undefined
  for (const { done: _done, ...rest } of done) {
    void _done
    const step: JourneyStep = { ...rest, state: 'done' }
    if (rest.at && previousAt)
      step.sinceMs = Math.max(0, Date.parse(rest.at) - Date.parse(previousAt))
    if (rest.at) previousAt = rest.at
    steps.push(step)
  }
  let next: JourneyStep | undefined
  pending.forEach(({ done: _done, ...rest }, i) => {
    void _done
    const step: JourneyStep = { ...rest, state: i === 0 ? 'current' : 'upcoming' }
    if (i === 0) {
      next = step
      if (previousAt) step.sinceMs = Math.max(0, nowMs - Date.parse(previousAt))
    }
    steps.push(step)
  })
  return { steps, ...(next ? { next } : {}) }
}

function admissionStatus(
  visit: EdVisit | undefined,
  admission: Admission | undefined,
): { status: JourneyStatus; active: boolean } {
  const edOpen = visit !== undefined && visit.phase !== 'LEFT_ED'
  if (edOpen) {
    if (admission?.status === 'IN_TRANSFER') return { status: 'IN_TRANSFER', active: true }
    if (admission?.status === 'BED_ASSIGNED') return { status: 'BED_RESERVED', active: true }
    switch (visit.phase) {
      case 'ARRIVED':
        return { status: 'ED_ARRIVED', active: true }
      case 'TRIAGED':
        return { status: 'ED_TRIAGED', active: true }
      case 'IN_ASSESSMENT':
        return { status: 'ED_IN_ASSESSMENT', active: true }
      default:
        return { status: 'ED_BOARDING', active: true }
    }
  }
  if (!admission) return { status: 'ED_LEFT', active: false }
  switch (admission.status) {
    case 'SCHEDULED':
      return { status: 'SCHEDULED', active: true }
    case 'AWAITING_BED':
      return { status: 'AWAITING_BED', active: true }
    case 'BED_ASSIGNED':
      return { status: 'BED_RESERVED', active: true }
    case 'IN_TRANSFER':
      return { status: 'IN_TRANSFER', active: true }
    case 'ADMITTED':
      return { status: 'ADMITTED', active: true }
    case 'DISCHARGE_ORDERED':
      return { status: 'DISCHARGE_ORDERED', active: true }
    case 'DISCHARGED':
      return { status: 'DISCHARGED', active: false }
    case 'CANCELLED':
      return { status: 'CANCELLED', active: false }
  }
}

function locationOf(
  visit: EdVisit | undefined,
  admission: Admission | undefined,
  status: JourneyStatus,
  lk: Lookups,
): JourneyLocation {
  const bed = bedLabelOf(lk, admission?.bedId)
  switch (status) {
    case 'ED_ARRIVED':
    case 'ED_TRIAGED':
    case 'ED_IN_ASSESSMENT':
    case 'ED_BOARDING':
    case 'BED_RESERVED':
      return visit && visit.phase !== 'LEFT_ED'
        ? { kind: 'ED', area: visit.area }
        : { kind: 'NONE' }
    case 'IN_TRANSFER':
      return { kind: 'TRANSFER', ...(bed ? { label: bed } : {}) }
    case 'ADMITTED':
    case 'DISCHARGE_ORDERED':
      return bed ? { kind: 'BED', label: bed } : { kind: 'NONE' }
    default:
      return { kind: 'NONE' }
  }
}

/**
 * ED steps followed by the admission steps. The pending "leaves the ED" step belongs after the
 * bed is reserved and the transfer picks the patient up, so that the next step shown is the one
 * that is actually blocking the patient.
 */
function withEdExit(ed: Draft[], admission: Draft[]): Draft[] {
  const exitIndex = ed.findIndex((d) => d.kind === 'EdLeft' && !d.done)
  if (exitIndex < 0) return [...ed, ...admission]
  const exit = ed[exitIndex]!
  const rest = ed.filter((_, i) => i !== exitIndex)
  let after = admission.findIndex((d) => d.kind === 'TransferPickedUp')
  if (after < 0) after = admission.findIndex((d) => d.kind === 'BedReserved')
  const at = after < 0 ? admission.length : after + 1
  return [...rest, ...admission.slice(0, at), exit, ...admission.slice(at)]
}

function buildEpisodes(patientId: Id, data: JourneyData, lk: Lookups): JourneyEpisode[] {
  const visits = lk.edByPatient.get(patientId) ?? []
  const admissions = lk.admissionsByPatient.get(patientId) ?? []
  const transfers = lk.transfersByPatient.get(patientId) ?? []
  const visitById = new Map(visits.map((v) => [v.id, v]))
  const usedVisits = new Set<Id>()
  const episodes: JourneyEpisode[] = []

  for (const admission of admissions) {
    const visit = admission.edVisitId ? visitById.get(admission.edVisitId) : undefined
    if (visit) usedVisits.add(visit.id)
    const drafts = withEdExit(
      visit ? edDrafts(visit, true) : [],
      admissionDrafts(admission, lk, transfers),
    )
    const { steps, next } = finishSteps(drafts, data.now)
    const { status, active } = admissionStatus(visit, admission)
    const last = steps.filter((s) => s.state === 'done').at(-1)
    const bedLabel = bedLabelOf(lk, admission.bedId)
    episodes.push({
      id: admission.id,
      kind: 'ADMISSION',
      startedAt: steps[0]?.at ?? admission.scheduledFor ?? admission.createdAt,
      active,
      status,
      location: locationOf(visit, admission, status, lk),
      ...(active && last?.at
        ? { sinceMs: Math.max(0, Date.parse(data.now) - Date.parse(last.at)) }
        : {}),
      steps,
      ...(next && active ? { next } : {}),
      ...(bedLabel ? { bedLabel } : {}),
    })
  }
  for (const visit of visits) {
    if (usedVisits.has(visit.id)) continue
    const { steps, next } = finishSteps(edDrafts(visit, false), data.now)
    const { status, active } = admissionStatus(visit, undefined)
    const last = steps.filter((s) => s.state === 'done').at(-1)
    episodes.push({
      id: visit.id,
      kind: 'ED',
      startedAt: visit.arrivedAt,
      active,
      status,
      location: locationOf(visit, undefined, status, lk),
      ...(active && last?.at
        ? { sinceMs: Math.max(0, Date.parse(data.now) - Date.parse(last.at)) }
        : {}),
      steps,
      ...(next && active ? { next } : {}),
      ...(visit.outcome ? { outcome: visit.outcome } : {}),
    })
  }
  // Active first, then newest.
  return episodes.sort(
    (a, b) => Number(b.active) - Number(a.active) || b.startedAt.localeCompare(a.startedAt),
  )
}

/** The whole journey of one patient; `undefined` for an unknown id. */
export function buildJourney(patientId: Id, data: JourneyData): Journey | undefined {
  const patient = data.patients.find((p) => p.id === patientId)
  if (!patient) return undefined
  const year = Number(zonedClock(data.now, HOSPITAL_TIME_ZONE).date.slice(0, 4))
  return {
    patient,
    initials: patientInitials(patient),
    ageYears: Math.max(0, year - patient.birthYear),
    episodes: buildEpisodes(patientId, data, lookups(data)),
  }
}

export type JourneyScope = { unitIds: ReadonlySet<Id> }

export type SearchResult = {
  patient: Patient
  initials: string
  /** The most relevant episode (active first), if the patient has any. */
  episode?: JourneyEpisode
  lastActivityAt: IsoDateTime
}

/** Does the patient have (or have had) a bed in one of the scoped units? */
function inScope(patientId: Id, scope: JourneyScope, lk: Lookups): boolean {
  return (lk.admissionsByPatient.get(patientId) ?? []).some((a) => {
    const bed = a.bedId ? lk.bedById.get(a.bedId) : undefined
    return bed !== undefined && scope.unitIds.has(bed.unitId)
  })
}

/**
 * Patients matching a query on NHC or name: every word of the query must be the start of the NHC
 * or of one of the words of the first name or surname (accent- and case-insensitive). Needs at
 * least `JOURNEY_MIN_QUERY` characters. A scope (nurse supervisor) only returns patients with an
 * admission in a bed of those units. Most recently active first.
 */
export function searchPatients(
  data: JourneyData,
  query: string,
  scope?: JourneyScope,
  limit = JOURNEY_SEARCH_LIMIT,
): SearchResult[] {
  const q = normalizeText(query)
  if (q.length < JOURNEY_MIN_QUERY) return []
  const tokens = q.split(/\s+/).filter(Boolean)
  const lk = lookups(data)

  const matches: { patient: Patient; lastActivityAt: IsoDateTime }[] = []
  for (const patient of data.patients) {
    const words = [
      normalizeText(patient.mrn),
      ...normalizeText(`${patient.firstName} ${patient.lastName}`).split(/\s+/),
    ]
    if (!tokens.every((t) => words.some((w) => w.startsWith(t)))) continue
    if (scope && !inScope(patient.id, scope, lk)) continue
    const stamps = [
      ...(lk.edByPatient.get(patient.id) ?? []),
      ...(lk.admissionsByPatient.get(patient.id) ?? []),
      ...(lk.transfersByPatient.get(patient.id) ?? []),
    ].map((e) => e.updatedAt)
    matches.push({
      patient,
      lastActivityAt: stamps.reduce((max, s) => (s > max ? s : max), patient.updatedAt),
    })
  }
  matches.sort(
    (a, b) =>
      b.lastActivityAt.localeCompare(a.lastActivityAt) ||
      a.patient.lastName.localeCompare(b.patient.lastName, 'es') ||
      a.patient.id.localeCompare(b.patient.id),
  )
  return matches.slice(0, limit).map(({ patient, lastActivityAt }) => {
    const episode = buildEpisodes(patient.id, data, lk)[0]
    return {
      patient,
      initials: patientInitials(patient),
      ...(episode ? { episode } : {}),
      lastActivityAt,
    }
  })
}
