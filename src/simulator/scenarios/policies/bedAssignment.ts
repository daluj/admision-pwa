import { reserveBed } from '@/domain/commands'
import type { Bed, BedRequest } from '@/domain/schemas'
import { addMinutes } from '@/lib/time'
import {
  MAX_RESERVATIONS_PER_MINUTE,
  OUTLIER_AFTER,
  OUTLIER_EXCLUDED_SPECIALTIES,
  RESERVATION_ETA,
  RESERVE_DELAY,
} from '../normalDay.config'
import { entityInt, minutesBetween } from '../entityRandom'
import type { MinuteContext } from '../types'
import { sortedById, type World } from '../world'

const PRIORITY_ORDER = { P1: 0, P2: 1, P3: 2 } as const

/**
 * The (simulated) bed manager reserves free beds for open requests, urgent first, matching unit
 * type, specialty and isolation. After a long wait an outlier bed (other specialty) is accepted.
 */
export async function bedAssignment(ctx: MinuteContext, world: World): Promise<void> {
  const { seed, at } = ctx
  const open = world.bedRequests
    .filter((r) => r.status === 'OPEN')
    .sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        a.requestedAt.localeCompare(b.requestedAt) ||
        a.id.localeCompare(b.id),
    )
  if (open.length === 0) return

  const free = sortedById(world.beds.filter((b) => b.status === 'AVAILABLE'))
  const taken = new Set<string>()
  let reservations = 0

  const candidates = (request: BedRequest, waited: number): Bed[] => {
    const usable = free.filter((bed) => {
      if (taken.has(bed.id)) return false
      const unit = world.unitById.get(bed.unitId)
      if (!unit || unit.type !== request.requiredUnitType) return false
      return !request.isolationRequired || bed.isolation === true
    })
    if (request.requiredUnitType !== 'WARD') return usable
    const own = usable.filter((bed) =>
      world.unitById.get(bed.unitId)?.specialtyCodes.includes(request.preferredSpecialtyCode),
    )
    if (own.length > 0 || waited < OUTLIER_AFTER) return own
    if (OUTLIER_EXCLUDED_SPECIALTIES.includes(request.preferredSpecialtyCode)) return []
    return usable.filter(
      (bed) =>
        !world.unitById
          .get(bed.unitId)
          ?.specialtyCodes.some((code) => OUTLIER_EXCLUDED_SPECIALTIES.includes(code)),
    )
  }

  for (const request of open) {
    if (reservations >= MAX_RESERVATIONS_PER_MINUTE) break
    const waited = minutesBetween(request.requestedAt, at)
    if (waited < entityInt(seed, 'reserve-delay', request.id, RESERVE_DELAY[request.priority])) {
      continue
    }
    const options = candidates(request, waited)
    if (options.length === 0) continue

    const bed = ctx.rng(`bed:${request.id}`).pick(options)
    taken.add(bed.id)
    reservations++
    await ctx.exec(reserveBed, {
      bedRequestId: request.id,
      bedId: bed.id,
      etaAt: addMinutes(at, entityInt(seed, 'eta', request.id, RESERVATION_ETA)),
    })
  }
}
