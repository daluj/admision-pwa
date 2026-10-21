import type {
  IsoDateTime,
  Patient,
  Porter,
  TransferPriority,
  TransferRequest,
  TransferStatus,
} from '@/domain/schemas'
import { HOSPITAL_TIME_ZONE, zonedClock } from '@/lib/time'
import { patientInitials } from './initials'
import { TRANSFER_THRESHOLDS } from './thresholds'

const MINUTE = 60_000
const OPEN: readonly TransferStatus[] = ['REQUESTED', 'ASSIGNED', 'PICKED_UP']

export type TransfersInput = {
  transfers: readonly TransferRequest[]
  porters: readonly Porter[]
  patients: readonly Patient[]
  now: IsoDateTime
  /** The porter a porter login drives (for the "Mi cola" view). */
  porterId?: string | null
}

export type QueueRow = {
  transfer: TransferRequest
  initials: string
  fromLabel: string
  toLabel: string
  status: TransferStatus
  priority: TransferPriority
  porter?: { id: string; name: string }
  /** `slaDueAt − now`: minutes left to pick up (negative = overdue). Only meaningful before pickup. */
  slaMs: number
  /** Not picked up and past `slaDueAt`. */
  overdue: boolean
  /** Time since the request. */
  waitMs: number
}

export type PorterRow = {
  porter: Porter
  /** The transfer the porter is working on (assigned or on the way). */
  job?: QueueRow
  /** Latest delivery by this porter (free since then); absent if none yet. */
  lastDeliveredAt?: IsoDateTime
}

export type TransferKpis = {
  open: number
  requested: number
  assigned: number
  pickedUp: number
  oldestUnassignedMs: number | null
  /** Median requested → picked up of the transfers picked up today; `null` without any. */
  medianPickupMs: number | null
  pickedUpToday: number
  withinSlaToday: number
  /** Share picked up within SLA today; `null` without any. */
  withinSlaPct: number | null
  deliveredToday: number
  portersAvailable: number
  portersBusy: number
  portersOff: number
}

export type TransferException = {
  id: string
  severity: 'critical' | 'warn'
  initials: string
  toLabel: string
  priority: TransferPriority
  overdueMs: number
  ageMs: number
}

export type PorterView = {
  porter: Porter
  /** Assigned to me and not delivered: the next step is the button. */
  work: QueueRow[]
  /** Unassigned, most urgent first (I can accept one while I am available). */
  openQueue: QueueRow[]
  deliveredToday: number
}

export type Transfers = {
  kpis: TransferKpis
  queue: QueueRow[]
  porters: PorterRow[]
  exceptions: TransferException[]
  /** Present when `porterId` matches a porter. */
  mine?: PorterView
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/** Everything the Traslados page shows, as a pure function of the data and the simulated `now`. */
export function computeTransfers(input: TransfersInput): Transfers {
  const { transfers, porters, patients, now, porterId } = input
  const nowMs = Date.parse(now)
  const today = zonedClock(now, HOSPITAL_TIME_ZONE).date
  const dateOf = (iso: string) => zonedClock(iso, HOSPITAL_TIME_ZONE).date
  const patientById = new Map(patients.map((p) => [p.id, p]))
  const porterById = new Map(porters.map((p) => [p.id, p]))

  const toRow = (transfer: TransferRequest): QueueRow => {
    const patient = patientById.get(transfer.patientId)
    const porter = transfer.porterId ? porterById.get(transfer.porterId) : undefined
    const slaMs = Date.parse(transfer.slaDueAt) - nowMs
    return {
      transfer,
      initials: patient ? patientInitials(patient) : '—',
      fromLabel: transfer.fromLocation.label,
      toLabel: transfer.toLocation.label,
      status: transfer.status,
      priority: transfer.priority,
      ...(porter ? { porter: { id: porter.id, name: porter.name } } : {}),
      slaMs,
      overdue: (transfer.status === 'REQUESTED' || transfer.status === 'ASSIGNED') && slaMs < 0,
      waitMs: Math.max(0, nowMs - Date.parse(transfer.requestedAt)),
    }
  }

  // Urgent first, then the one closest to (or furthest past) its SLA.
  const byUrgency = (a: QueueRow, b: QueueRow) =>
    Number(b.priority === 'URGENT') - Number(a.priority === 'URGENT') ||
    a.transfer.slaDueAt.localeCompare(b.transfer.slaDueAt) ||
    a.transfer.id.localeCompare(b.transfer.id)

  const queue = transfers
    .filter((t) => OPEN.includes(t.status))
    .map(toRow)
    .sort(byUrgency)

  const pickedToday = transfers.filter(
    (t) => t.pickedUpAt !== undefined && dateOf(t.pickedUpAt) === today && t.status !== 'CANCELLED',
  )
  const pickups = pickedToday.map((t) => Date.parse(t.pickedUpAt!) - Date.parse(t.requestedAt))
  const withinSla = pickedToday.filter(
    (t) => Date.parse(t.pickedUpAt!) <= Date.parse(t.slaDueAt),
  ).length
  const unassigned = queue.filter((r) => r.status === 'REQUESTED')

  const kpis: TransferKpis = {
    open: queue.length,
    requested: unassigned.length,
    assigned: queue.filter((r) => r.status === 'ASSIGNED').length,
    pickedUp: queue.filter((r) => r.status === 'PICKED_UP').length,
    oldestUnassignedMs: unassigned.length ? Math.max(...unassigned.map((r) => r.waitMs)) : null,
    medianPickupMs: median(pickups),
    pickedUpToday: pickedToday.length,
    withinSlaToday: withinSla,
    withinSlaPct: pickedToday.length === 0 ? null : withinSla / pickedToday.length,
    deliveredToday: transfers.filter(
      (t) =>
        t.status === 'DELIVERED' && t.deliveredAt !== undefined && dateOf(t.deliveredAt) === today,
    ).length,
    portersAvailable: porters.filter((p) => p.status === 'AVAILABLE').length,
    portersBusy: porters.filter((p) => p.status === 'BUSY').length,
    portersOff: porters.filter((p) => p.status === 'OFF_SHIFT').length,
  }

  const jobByPorter = new Map<string, QueueRow>()
  for (const row of queue) {
    if (row.porter && (row.status === 'ASSIGNED' || row.status === 'PICKED_UP')) {
      const current = jobByPorter.get(row.porter.id)
      // A porter normally has one job; if several, show the one already on the way.
      if (!current || row.status === 'PICKED_UP') jobByPorter.set(row.porter.id, row)
    }
  }
  const lastDelivered = new Map<string, IsoDateTime>()
  for (const t of transfers) {
    if (t.status !== 'DELIVERED' || !t.porterId || !t.deliveredAt) continue
    const seen = lastDelivered.get(t.porterId)
    if (!seen || t.deliveredAt > seen) lastDelivered.set(t.porterId, t.deliveredAt)
  }
  const porterRows: PorterRow[] = porters
    .filter((p) => p.status !== 'OFF_SHIFT')
    .map((porter) => {
      const job = jobByPorter.get(porter.id)
      const last = lastDelivered.get(porter.id)
      return { porter, ...(job ? { job } : {}), ...(last ? { lastDeliveredAt: last } : {}) }
    })
    .sort(
      (a, b) =>
        a.porter.status.localeCompare(b.porter.status) ||
        a.porter.name.localeCompare(b.porter.name, 'es'),
    )

  const exceptions: TransferException[] = queue
    .filter((r) => r.overdue)
    .map((r) => ({
      id: `sla:${r.transfer.id}`,
      severity: r.priority === 'URGENT' ? ('critical' as const) : ('warn' as const),
      initials: r.initials,
      toLabel: r.toLabel,
      priority: r.priority,
      overdueMs: -r.slaMs,
      ageMs: -r.slaMs,
    }))
    .sort((a, b) =>
      a.severity === b.severity ? b.ageMs - a.ageMs : a.severity === 'critical' ? -1 : 1,
    )

  const me = porterId ? porterById.get(porterId) : undefined
  const mine: PorterView | undefined = me
    ? {
        porter: me,
        work: queue
          .filter(
            (r) => r.porter?.id === me.id && (r.status === 'ASSIGNED' || r.status === 'PICKED_UP'),
          )
          .sort(
            (a, b) =>
              Number(b.status === 'PICKED_UP') - Number(a.status === 'PICKED_UP') ||
              byUrgency(a, b),
          ),
        openQueue: unassigned,
        deliveredToday: transfers.filter(
          (t) =>
            t.porterId === me.id &&
            t.status === 'DELIVERED' &&
            t.deliveredAt !== undefined &&
            dateOf(t.deliveredAt) === today,
        ).length,
      }
    : undefined

  return { kpis, queue, porters: porterRows, exceptions, ...(mine ? { mine } : {}) }
}

/** SLA tile: ok ≥ 90 %, warn ≥ 75 %, critical below, neutral without data. */
export function slaStatus(pct: number | null): 'ok' | 'warn' | 'critical' | 'neutral' {
  if (pct === null) return 'neutral'
  if (pct >= TRANSFER_THRESHOLDS.slaObjective) return 'ok'
  return pct >= TRANSFER_THRESHOLDS.slaWarn ? 'warn' : 'critical'
}

/** Unassigned requests: amber past 5 min, red past 15 min (oldest). */
export function unassignedStatus(oldestMs: number | null): 'ok' | 'warn' | 'critical' | 'neutral' {
  if (oldestMs === null) return 'neutral'
  if (oldestMs > TRANSFER_THRESHOLDS.unassignedCriticalMin * MINUTE) return 'critical'
  return oldestMs > TRANSFER_THRESHOLDS.unassignedWarnMin * MINUTE ? 'warn' : 'ok'
}
