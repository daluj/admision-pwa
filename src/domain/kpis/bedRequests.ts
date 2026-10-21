import type {
  Admission,
  Bed,
  BedRequest,
  EdVisit,
  IsoDateTime,
  Patient,
  Specialty,
  TriageLevel,
  Unit,
} from '@/domain/schemas'
import { patientInitials } from './initials'
import { OUTLIER_EXCLUDED_SPECIALTIES } from './thresholds'

export type RequestSource = { kind: 'ED'; triageLevel?: TriageLevel } | { kind: 'SCHEDULED' }

export type OpenRequestRow = {
  request: BedRequest
  admission: Admission
  /** Initials only: the list may be on a shared screen. */
  initials?: string
  source: RequestSource
  specialtyName: string
  waitMs: number
}

const PRIORITY_ORDER = { P1: 0, P2: 1, P3: 2 } as const

export type OpenRequests = {
  /** `OPEN` requests, most urgent first, then longest wait. */
  open: OpenRequestRow[]
  /** Requests that already have a reserved bed (waiting for the transfer). */
  assignedCount: number
}

export function openBedRequests(input: {
  requests: readonly BedRequest[]
  admissions: readonly Admission[]
  patients: readonly Patient[]
  edVisits: readonly EdVisit[]
  specialties: readonly Specialty[]
  now: IsoDateTime
}): OpenRequests {
  const { requests, admissions, patients, edVisits, specialties, now } = input
  const admissionById = new Map(admissions.map((a) => [a.id, a]))
  const patientById = new Map(patients.map((p) => [p.id, p]))
  const visitById = new Map(edVisits.map((v) => [v.id, v]))
  const nameByCode = new Map(specialties.map((s) => [s.code, s.name]))
  const nowMs = Date.parse(now)

  const open: OpenRequestRow[] = []
  for (const request of requests) {
    if (request.status !== 'OPEN') continue
    const admission = admissionById.get(request.admissionId)
    if (!admission) continue
    const patient = patientById.get(admission.patientId)
    const visit = admission.edVisitId ? visitById.get(admission.edVisitId) : undefined
    open.push({
      request,
      admission,
      ...(patient ? { initials: patientInitials(patient) } : {}),
      source:
        admission.type === 'URGENT'
          ? { kind: 'ED', ...(visit?.triageLevel ? { triageLevel: visit.triageLevel } : {}) }
          : { kind: 'SCHEDULED' },
      specialtyName:
        nameByCode.get(request.preferredSpecialtyCode) ?? request.preferredSpecialtyCode,
      waitMs: Math.max(0, nowMs - Date.parse(request.requestedAt)),
    })
  }
  open.sort(
    (a, b) =>
      PRIORITY_ORDER[a.request.priority] - PRIORITY_ORDER[b.request.priority] ||
      b.waitMs - a.waitMs ||
      a.request.id.localeCompare(b.request.id),
  )
  return {
    open,
    assignedCount: requests.filter((r) => r.status === 'ASSIGNED').length,
  }
}

export type SuggestionTag = 'SPECIALTY' | 'OUTLIER' | 'ISOLATION'

export type BedSuggestion = { bed: Bed; unit: Unit; tags: SuggestionTag[] }

export type BedSuggestions = {
  /** The best few, ranked. */
  suggestions: BedSuggestion[]
  /** Every compatible free bed, ranked. */
  candidates: BedSuggestion[]
}

export const SUGGESTION_COUNT = 5

/**
 * Free beds that can take a request, best first.
 * - unit type must match the request;
 * - isolation beds only when isolation is required (otherwise they are kept free);
 * - in wards, a bed of the requested specialty ranks first; an outlier bed (other specialty) is
 *   offered after them, but never for specialties in `OUTLIER_EXCLUDED_SPECIALTIES` nor in their wards;
 * - ICU / intermediate units ignore specialty;
 * - ties: the bed that has been free the longest, then unit code and label.
 */
export function suggestBeds(input: {
  request: Pick<BedRequest, 'requiredUnitType' | 'preferredSpecialtyCode' | 'isolationRequired'>
  beds: readonly Bed[]
  units: readonly Unit[]
}): BedSuggestions {
  const { request, beds, units } = input
  const unitById = new Map(units.map((u) => [u.id, u]))
  const ranked: Array<BedSuggestion & { rank: number }> = []

  for (const bed of beds) {
    if (bed.status !== 'AVAILABLE') continue
    const unit = unitById.get(bed.unitId)
    if (!unit || unit.type !== request.requiredUnitType) continue
    if (request.isolationRequired ? bed.isolation !== true : bed.isolation === true) continue

    const tags: SuggestionTag[] = []
    let rank = 0
    if (unit.type === 'WARD') {
      if (unit.specialtyCodes.includes(request.preferredSpecialtyCode)) {
        tags.push('SPECIALTY')
      } else {
        const excluded =
          OUTLIER_EXCLUDED_SPECIALTIES.includes(request.preferredSpecialtyCode) ||
          unit.specialtyCodes.some((code) => OUTLIER_EXCLUDED_SPECIALTIES.includes(code))
        if (excluded) continue
        tags.push('OUTLIER')
        rank = 1
      }
    }
    if (request.isolationRequired) tags.push('ISOLATION')
    ranked.push({ bed, unit, tags, rank })
  }

  ranked.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.bed.statusChangedAt.localeCompare(b.bed.statusChangedAt) ||
      a.unit.code.localeCompare(b.unit.code) ||
      a.bed.label.localeCompare(b.bed.label, 'es', { numeric: true }),
  )
  const candidates = ranked.map(({ bed, unit, tags }) => ({ bed, unit, tags }))
  return { suggestions: candidates.slice(0, SUGGESTION_COUNT), candidates }
}
