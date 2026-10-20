import { z } from 'zod'
import { EntityBase, IsoDateTime } from './common'

export const SIMULATION_SPEEDS = [1, 10, 60, 300] as const
export const SimulationSpeed = z.literal(SIMULATION_SPEEDS)
export type SimulationSpeed = z.infer<typeof SimulationSpeed>

export const SIMULATION_STATE_ID = 'current'

/** Singleton row describing the simulator run. */
export const SimulationState = EntityBase.extend({
  id: z.literal(SIMULATION_STATE_ID),
  seed: z.int(),
  scenarioId: z.string().min(1),
  speed: SimulationSpeed,
  running: z.boolean(),
  simNow: IsoDateTime,
  startedAt: IsoDateTime,
})
export type SimulationState = z.infer<typeof SimulationState>
