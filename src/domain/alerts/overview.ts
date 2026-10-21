import {
  computeAdmissions,
  computeCensus,
  computeEd,
  computeTransfers,
  slaStatus,
  type AdmissionsKpis,
  type BalanceForecast,
  type CensusKpis,
  type EdKpis,
  type HourBucket,
  type TileStatus,
  type TransferKpis,
} from '@/domain/kpis'
import type { Admission, IsoDateTime } from '@/domain/schemas'
import type { AlertConfig } from './config'
import type { AlertInput } from './rules'
import { computeStatusLevel, type HospitalStatus } from './status'

export type FlowBucket = {
  /** Start of the clock hour (ISO UTC). */
  start: IsoDateTime
  admitted: number
  discharged: number
  /** The current clock hour: still filling up. */
  partial: boolean
}

export type Overview = {
  status: HospitalStatus
  census: CensusKpis
  ed: EdKpis
  admissions: AdmissionsKpis
  balance: BalanceForecast
  transfers: TransferKpis
  /** % of L2–L5 patients seen within target, per clock hour, last 24 h. */
  edHourly: HourBucket[]
  /** Admissions and discharges per clock hour, last 24 h (oldest first). */
  flow: FlowBucket[]
  /** Tile colours, from the configured thresholds. */
  tiles: {
    occupancy: TileStatus
    boarding: TileStatus
    balance: TileStatus
    sla: TileStatus
  }
}

const HOUR = 3_600_000

/** Admissions (`admittedAt`) and discharges (`dischargedAt`) per clock hour over the last 24 h. */
export function hourlyFlow(admissions: readonly Admission[], now: IsoDateTime): FlowBucket[] {
  const currentStart = Math.floor(Date.parse(now) / HOUR) * HOUR
  const buckets: FlowBucket[] = Array.from({ length: 24 }, (_, i) => ({
    start: new Date(currentStart - (23 - i) * HOUR).toISOString(),
    admitted: 0,
    discharged: 0,
    partial: i === 23,
  }))
  const firstStart = currentStart - 23 * HOUR
  const place = (iso: string | undefined, field: 'admitted' | 'discharged') => {
    if (!iso) return
    const t = Date.parse(iso)
    if (t < firstStart || t >= currentStart + HOUR) return
    buckets[Math.floor((t - firstStart) / HOUR)]![field]++
  }
  for (const a of admissions) {
    place(a.admittedAt, 'admitted')
    place(a.dischargedAt, 'discharged')
  }
  return buckets
}

/** Everything the control-tower overview shows, from one pass over the data. */
export function computeOverview(input: AlertInput, config: AlertConfig): Overview {
  const { now } = input
  const census = computeCensus({
    beds: input.beds,
    units: input.units,
    admissions: input.admissions,
    patients: input.patients,
    now,
  })
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
  const transfers = computeTransfers({
    transfers: input.transfers,
    porters: input.porters,
    patients: input.patients,
    now,
  })
  const occupancy = census.hospital.occupancy
  const boarding = ed.kpis.boarding
  const balance = admissions.balance.value
  return {
    status: computeStatusLevel(census, ed, config),
    census: census.hospital,
    ed: ed.kpis,
    admissions: admissions.kpis,
    balance: admissions.balance,
    transfers: transfers.kpis,
    edHourly: ed.hourly,
    flow: hourlyFlow(input.admissions, now),
    tiles: {
      occupancy:
        occupancy >= config.occupancyCritical
          ? 'critical'
          : occupancy >= config.occupancyAlert
            ? 'warn'
            : 'ok',
      boarding:
        boarding > config.boardingCountCritical
          ? 'critical'
          : boarding > config.boardingCountAlert
            ? 'warn'
            : 'ok',
      balance: balance < config.balanceCritical ? 'critical' : balance < 0 ? 'warn' : 'ok',
      sla: slaStatus(transfers.kpis.withinSlaPct),
    },
  }
}
