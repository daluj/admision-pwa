import { finishCleaning, startCleaning } from '@/domain/commands'
import { CLEANING_DURATION, CLEANING_START_DELAY } from '../normalDay.config'
import { entityInt, minutesBetween } from '../entityRandom'
import type { MinuteContext } from '../types'
import { sortedById, type World } from '../world'

/** Housekeeping: dirty beds are picked up after a delay, then cleaned. */
export async function cleaning(ctx: MinuteContext, world: World): Promise<void> {
  const { seed, at } = ctx
  for (const bed of sortedById(world.beds)) {
    const elapsed = minutesBetween(bed.statusChangedAt, at)
    if (bed.status === 'PENDING_CLEANING') {
      if (
        elapsed >=
        entityInt(seed, 'clean-start', `${bed.id}:${bed.statusChangedAt}`, CLEANING_START_DELAY)
      ) {
        await ctx.exec(startCleaning, { bedId: bed.id })
      }
    } else if (bed.status === 'CLEANING') {
      if (
        elapsed >=
        entityInt(seed, 'clean-end', `${bed.id}:${bed.statusChangedAt}`, CLEANING_DURATION)
      ) {
        await ctx.exec(finishCleaning, { bedId: bed.id })
      }
    }
  }
}
