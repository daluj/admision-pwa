import type { EntityName, EntityOf } from '@/domain/schemas'
import { ENTITY_NAMES } from '@/domain/schemas'
import type { DataBackend } from '@/data/ports'

/** Every table's rows, keyed by entity name. */
export type StateSnapshot = { [N in EntityName]: EntityOf<N>[] }

export async function readState(backend: DataBackend): Promise<StateSnapshot> {
  const entries = await Promise.all(
    ENTITY_NAMES.map(async (name) => [name, await backend.repositories[name].list()] as const),
  )
  return Object.fromEntries(entries) as unknown as StateSnapshot
}

const IN_BED = ['ADMITTED', 'DISCHARGE_ORDERED']
const RESERVING = ['BED_ASSIGNED', 'IN_TRANSFER']

/**
 * Cross-entity link rules that must hold after every command, whatever the time of day
 * (unlike the seed rules, no occupancy target). Returns human-readable violations (empty = valid).
 */
export function stateViolations(s: StateSnapshot): string[] {
  const v: string[] = []
  const bedById = new Map(s.bed.map((b) => [b.id, b]))
  const admissionById = new Map(s.admission.map((a) => [a.id, a]))

  const patientBeds = new Map<string, number>()
  for (const bed of s.bed) {
    if (bed.status === 'OCCUPIED') {
      const a = admissionById.get(bed.admissionId ?? '')
      if (!a || !IN_BED.includes(a.status) || a.bedId !== bed.id || a.patientId !== bed.patientId) {
        v.push(`occupied bed ${bed.label} not linked to an admitted admission`)
      }
    } else if (bed.status === 'RESERVED') {
      const a = admissionById.get(bed.admissionId ?? '')
      if (!a || !RESERVING.includes(a.status) || a.bedId !== bed.id) {
        v.push(`reserved bed ${bed.label} not linked to a bed-assigned admission`)
      }
    } else if (bed.patientId || bed.admissionId) {
      v.push(`${bed.status} bed ${bed.label} still has a patient`)
    }
    if (bed.status === 'BLOCKED' && !bed.blockedReason) v.push(`blocked bed ${bed.label} no reason`)
    if (bed.status !== 'BLOCKED' && bed.blockedReason) v.push(`bed ${bed.label} stale block reason`)
    if (bed.patientId && (bed.status === 'OCCUPIED' || bed.status === 'RESERVED')) {
      patientBeds.set(bed.patientId, (patientBeds.get(bed.patientId) ?? 0) + 1)
    }
  }
  for (const [patientId, n] of patientBeds) if (n > 1) v.push(`patient ${patientId} in ${n} beds`)

  for (const a of s.admission) {
    const bed = bedById.get(a.bedId ?? '')
    if (IN_BED.includes(a.status) && (bed?.status !== 'OCCUPIED' || bed.admissionId !== a.id)) {
      v.push(`admission ${a.id} (${a.status}) bed not occupied by it`)
    }
    if (RESERVING.includes(a.status) && (bed?.status !== 'RESERVED' || bed.admissionId !== a.id)) {
      v.push(`admission ${a.id} (${a.status}) bed not reserved for it`)
    }
    if (['SCHEDULED', 'AWAITING_BED', 'CANCELLED'].includes(a.status) && a.bedId) {
      v.push(`admission ${a.id} (${a.status}) has a bed`)
    }
    if (a.status === 'DISCHARGED' && !a.dischargedAt) v.push(`admission ${a.id} no dischargedAt`)
    if (IN_BED.includes(a.status) && !a.admittedAt) v.push(`admission ${a.id} no admittedAt`)
  }

  for (const r of s.bedRequest) {
    const a = admissionById.get(r.admissionId)
    if (!a) {
      v.push(`bed request ${r.id} unknown admission`)
    } else if (r.status === 'OPEN' && a.status !== 'AWAITING_BED') {
      v.push(`open request ${r.id} but admission is ${a.status}`)
    } else if (r.status === 'ASSIGNED') {
      const bed = bedById.get(r.assignedBedId ?? '')
      if (!RESERVING.includes(a.status) || bed?.status !== 'RESERVED') {
        v.push(`assigned request ${r.id} inconsistent`)
      }
    }
    if (r.status === 'OPEN' && r.assignedBedId) v.push(`open request ${r.id} has a bed`)
  }

  const activeByPorter = new Set(
    s.transferRequest
      .filter((t) => t.status === 'ASSIGNED' || t.status === 'PICKED_UP')
      .map((t) => t.porterId),
  )
  for (const p of s.porter) {
    if (p.status === 'BUSY' && !activeByPorter.has(p.id))
      v.push(`porter ${p.id} busy without a job`)
    if (p.status === 'AVAILABLE' && activeByPorter.has(p.id)) v.push(`porter ${p.id} has a job`)
  }

  for (const visit of s.edVisit) {
    const ms = [
      visit.arrivedAt,
      visit.triagedAt,
      visit.seenAt,
      visit.admitDecisionAt,
      visit.endedAt,
    ]
    const present = ms.filter(Boolean) as string[]
    if ([...present].sort().join() !== present.join())
      v.push(`ed ${visit.id} milestones out of order`)
    if (visit.phase === 'ADMIT_DECISION' && !s.admission.some((a) => a.edVisitId === visit.id)) {
      v.push(`boarding ${visit.id} without admission`)
    }
    if (visit.phase === 'LEFT_ED' && (!visit.outcome || !visit.endedAt)) {
      v.push(`ed ${visit.id} left without outcome`)
    }
  }

  if (new Set(s.patient.map((p) => p.mrn)).size !== s.patient.length) v.push('duplicate MRN')
  return v
}
