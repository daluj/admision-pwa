import {
  BED_STATUSES,
  type Admission,
  type Bed,
  type BedStatus,
  type IsoDateTime,
  type Patient,
  type Unit,
} from '@/domain/schemas'
import { HOSPITAL_TIME_ZONE, zonedClock } from '@/lib/time'
import { patientInitials } from './initials'
import { CENSUS_THRESHOLDS } from './thresholds'

const IN_BED = ['ADMITTED', 'DISCHARGE_ORDERED']

export type BedCounts = Record<BedStatus, number> & {
  total: number
  /** Not blocked. */
  operational: number
}

export function bedCounts(beds: readonly Bed[]): BedCounts {
  const counts = Object.fromEntries(BED_STATUSES.map((s) => [s, 0])) as Record<BedStatus, number>
  for (const bed of beds) counts[bed.status]++
  return { ...counts, total: beds.length, operational: beds.length - counts.BLOCKED }
}

/** Occupied ÷ operational beds (0 when there are none). */
export function occupancyOf(counts: BedCounts): number {
  return counts.operational === 0 ? 0 : counts.OCCUPIED / counts.operational
}

export type CensusKpis = {
  counts: BedCounts
  occupancy: number
  inpatients: number
  outliers: number
  outlierUnits: number
  /** Admissions with an expected discharge on the local day (done or not). */
  expectedToday: number
  /** Discharges completed on the local day. */
  dischargedToday: number
}

/** One bed with everything a tile needs; patient identity is split so the face can show initials only. */
export type BedView = {
  bed: Bed
  unit: Unit
  patient?: { initials: string; fullName: string; mrn: string }
  admittedAt?: IsoDateTime
  /** Length of stay of an occupying patient, ms. */
  losMs?: number
  expectedDischargeAt?: IsoDateTime
  dischargeOrdered: boolean
  specialtyCode?: string
  outlier: boolean
}

export type UnitCensus = { unit: Unit; kpis: CensusKpis; beds: BedView[] }

export type Census = {
  hospital: CensusKpis
  /** Units with beds, by building, floor and name. */
  units: UnitCensus[]
}

export type CensusInput = {
  beds: readonly Bed[]
  units: readonly Unit[]
  admissions: readonly Admission[]
  patients: readonly Patient[]
  now: IsoDateTime
}

const unitOrder = (a: Unit, b: Unit) =>
  a.building.localeCompare(b.building, 'es') ||
  a.floor - b.floor ||
  a.name.localeCompare(b.name, 'es')

const bedOrder = (a: Bed, b: Bed) => a.label.localeCompare(b.label, 'es', { numeric: true })

const isOutlier = (unit: Unit, admission: Admission) =>
  unit.type === 'WARD' && !unit.specialtyCodes.includes(admission.specialtyCode)

function kpisFor(
  beds: readonly BedView[],
  admissions: readonly Admission[],
  bedUnit: ReadonlyMap<string, Unit>,
  today: string,
): CensusKpis {
  const counts = bedCounts(beds.map((v) => v.bed))
  const inBed = beds.filter((v) => v.bed.status === 'OCCUPIED')
  const outliers = inBed.filter((v) => v.outlier)
  const scoped = admissions.filter((a) => a.bedId && bedUnit.has(a.bedId))
  return {
    counts,
    occupancy: occupancyOf(counts),
    inpatients: inBed.length,
    outliers: outliers.length,
    outlierUnits: new Set(outliers.map((v) => v.unit.id)).size,
    expectedToday: scoped.filter(
      (a) =>
        (IN_BED.includes(a.status) || a.status === 'DISCHARGED') &&
        a.expectedDischargeAt !== undefined &&
        zonedClock(a.expectedDischargeAt, HOSPITAL_TIME_ZONE).date === today,
    ).length,
    dischargedToday: scoped.filter(
      (a) =>
        a.status === 'DISCHARGED' &&
        a.dischargedAt !== undefined &&
        zonedClock(a.dischargedAt, HOSPITAL_TIME_ZONE).date === today,
    ).length,
  }
}

/**
 * Census of the given units: hospital KPIs, per-unit KPIs and one `BedView` per bed.
 * Only beds of `units` count (pass a filtered list to scope everything); units without beds (ED)
 * are left out. `now` is the simulated time.
 */
export function computeCensus({ beds, units, admissions, patients, now }: CensusInput): Census {
  const today = zonedClock(now, HOSPITAL_TIME_ZONE).date
  const unitById = new Map(units.map((u) => [u.id, u]))
  const admissionById = new Map(admissions.map((a) => [a.id, a]))
  const patientById = new Map(patients.map((p) => [p.id, p]))
  const nowMs = Date.parse(now)

  const views: BedView[] = []
  const bedUnit = new Map<string, Unit>()
  for (const bed of [...beds].sort(bedOrder)) {
    const unit = unitById.get(bed.unitId)
    if (!unit) continue
    bedUnit.set(bed.id, unit)
    const admission = bed.admissionId ? admissionById.get(bed.admissionId) : undefined
    const patient = bed.patientId ? patientById.get(bed.patientId) : undefined
    const occupied = bed.status === 'OCCUPIED' && admission !== undefined
    views.push({
      bed,
      unit,
      ...(patient
        ? {
            patient: {
              initials: patientInitials(patient),
              fullName: `${patient.firstName} ${patient.lastName}`,
              mrn: patient.mrn,
            },
          }
        : {}),
      ...(occupied && admission.admittedAt
        ? {
            admittedAt: admission.admittedAt,
            losMs: Math.max(0, nowMs - Date.parse(admission.admittedAt)),
          }
        : {}),
      ...(occupied && admission.expectedDischargeAt
        ? { expectedDischargeAt: admission.expectedDischargeAt }
        : {}),
      dischargeOrdered: occupied && admission.status === 'DISCHARGE_ORDERED',
      ...(admission ? { specialtyCode: admission.specialtyCode } : {}),
      outlier: occupied && IN_BED.includes(admission.status) && isOutlier(unit, admission),
    })
  }

  const byUnit = new Map<string, BedView[]>()
  for (const view of views) byUnit.set(view.unit.id, [...(byUnit.get(view.unit.id) ?? []), view])

  const unitCensus: UnitCensus[] = [...byUnit.entries()]
    .map(([unitId, unitBeds]) => {
      const unit = unitById.get(unitId)!
      const scopedUnits = new Map(unitBeds.map((v) => [v.bed.id, unit]))
      return { unit, beds: unitBeds, kpis: kpisFor(unitBeds, admissions, scopedUnits, today) }
    })
    .sort((a, b) => unitOrder(a.unit, b.unit))

  return { hospital: kpisFor(views, admissions, bedUnit, today), units: unitCensus }
}

export type ExceptionSeverity = 'critical' | 'warn' | 'info'

export type CensusException =
  | {
      id: string
      kind: 'blockedLong'
      severity: 'warn'
      unitCode: string
      bedLabel: string
      reason: string
      ageMs: number
    }
  | {
      id: string
      kind: 'unitFull'
      severity: 'critical' | 'warn'
      unitCode: string
      unitName: string
      occupancy: number
      ageMs: 0
    }
  | {
      id: string
      kind: 'outlier'
      severity: 'info'
      unitCode: string
      unitName: string
      bedLabel: string
      initials: string
      specialtyCode: string
      ageMs: number
    }

const SEVERITY_ORDER: Record<ExceptionSeverity, number> = { critical: 0, warn: 1, info: 2 }

/** Census-level exceptions, most severe first, then oldest first. */
export function censusExceptions(census: Census, now: IsoDateTime): CensusException[] {
  const nowMs = Date.parse(now)
  const out: CensusException[] = []

  for (const { unit, kpis, beds } of census.units) {
    if (kpis.occupancy >= CENSUS_THRESHOLDS.occupancyWarn) {
      out.push({
        id: `full:${unit.id}`,
        kind: 'unitFull',
        severity: kpis.occupancy >= CENSUS_THRESHOLDS.occupancyCritical ? 'critical' : 'warn',
        unitCode: unit.code,
        unitName: unit.name,
        occupancy: kpis.occupancy,
        ageMs: 0,
      })
    }
    for (const view of beds) {
      const { bed } = view
      if (bed.status === 'BLOCKED') {
        const ageMs = nowMs - Date.parse(bed.statusChangedAt)
        if (ageMs > CENSUS_THRESHOLDS.blockedLongHours * 3_600_000) {
          out.push({
            id: `blocked:${bed.id}`,
            kind: 'blockedLong',
            severity: 'warn',
            unitCode: unit.code,
            bedLabel: bed.label,
            reason: bed.blockedReason ?? '',
            ageMs,
          })
        }
      }
      if (view.outlier && view.patient && view.specialtyCode) {
        out.push({
          id: `outlier:${bed.id}`,
          kind: 'outlier',
          severity: 'info',
          unitCode: unit.code,
          unitName: unit.name,
          bedLabel: bed.label,
          initials: view.patient.initials,
          specialtyCode: view.specialtyCode,
          ageMs: view.losMs ?? 0,
        })
      }
    }
  }

  return out.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.ageMs - a.ageMs,
  )
}
