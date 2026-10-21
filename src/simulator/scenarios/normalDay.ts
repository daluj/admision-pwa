import { localTime } from './localTime'
import { bedAssignment } from './policies/bedAssignment'
import { bedBlocks } from './policies/bedBlocks'
import { cleaning } from './policies/cleaning'
import { discharges } from './policies/discharges'
import { edArrivals } from './policies/edArrivals'
import { edFlow } from './policies/edFlow'
import { scheduledAdmissions } from './policies/scheduledAdmissions'
import { transfersFlow } from './policies/transfersFlow'
import type { ScenarioTuning } from './tuning'
import type { Scenario } from './types'
import { loadWorld } from './world'

import { NORMAL_DAY_ID } from './definitions'

export { NORMAL_DAY_ID }

const step: Scenario['step'] = async (ctx) => {
  const world = await loadWorld(ctx)
  const local = localTime(ctx.at)
  await edArrivals(ctx, world, local)
  await edFlow(ctx, world)
  await bedAssignment(ctx, world)
  await transfersFlow(ctx, world)
  await scheduledAdmissions(ctx, world, local)
  await discharges(ctx, world, local)
  await cleaning(ctx, world)
  await bedBlocks(ctx, world, local)
}

/** The same policies with another id and tuning: how every scenario is made (`definitions.ts`). */
export function createScenario(id: string, tuning?: ScenarioTuning): Scenario {
  return { id, ...(tuning ? { tuning } : {}), step }
}

/**
 * "Martes normal": a typical weekday. Each simulated minute the policies look at the hospital and
 * act through domain commands (see `normalDay.config.ts` for every number).
 */
export const normalDay: Scenario = createScenario(NORMAL_DAY_ID)
