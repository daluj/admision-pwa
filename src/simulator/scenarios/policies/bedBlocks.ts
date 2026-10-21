import { blockBed, unblockBed } from '@/domain/commands'
import { BLOCK_REASONS } from '@/simulator/seed/generateCensus'
import { UNBLOCK_DAILY_SHARE, UNBLOCK_HOURS, UNBLOCK_MIN_BLOCKED } from '../normalDay.config'
import { entityChance, entitySlot, minutesBetween } from '../entityRandom'
import type { LocalTime } from '../localTime'
import type { MinuteContext } from '../types'
import { sortedById, type World } from '../world'

/** Rare maintenance blocks on free ward beds; blocked beds come back during the day. */
export async function bedBlocks(ctx: MinuteContext, world: World, local: LocalTime): Promise<void> {
  const { seed, at } = ctx
  const rng = ctx.rng('block')

  if (rng.chance(ctx.tuning.blocksPerDay / 1440)) {
    const candidates = sortedById(
      world.beds.filter(
        (bed) => bed.status === 'AVAILABLE' && world.unitById.get(bed.unitId)?.type === 'WARD',
      ),
    )
    if (candidates.length > 0) {
      await ctx.exec(blockBed, { bedId: rng.pick(candidates).id, reason: rng.pick(BLOCK_REASONS) })
    }
  }

  for (const bed of sortedById(world.beds)) {
    if (bed.status !== 'BLOCKED') continue
    if (minutesBetween(bed.statusChangedAt, at) < UNBLOCK_MIN_BLOCKED) continue
    if (local.minuteOfDay !== entitySlot(seed, 'unblock-slot', bed.id, UNBLOCK_HOURS)) continue
    if (entityChance(seed, `unblock:${local.date}`, bed.id, UNBLOCK_DAILY_SHARE)) {
      await ctx.exec(unblockBed, { bedId: bed.id })
    }
  }
}
