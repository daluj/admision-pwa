import type { Change } from '@/data/ports'
import {
  SIMULATION_SPEEDS,
  SIMULATION_STATE_ID,
  type IsoDateTime,
  type SimulationSpeed,
  type SimulationState,
} from '@/domain/schemas'
import {
  buildEvent,
  InvalidCommandError,
  putChange,
  requireEntity,
  type Command,
  type CommandContext,
} from './types'

const current = (ctx: CommandContext) => requireEntity(ctx, 'simulationState', SIMULATION_STATE_ID)

/** Starts the simulator clock. Emits `SimulationStarted`. */
export const startSimulation: Command<Record<string, never>> = async (ctx) => {
  const state = await current(ctx)
  if (state.running) throw new InvalidCommandError('The simulation is already running')
  return {
    events: [buildEvent(ctx, 'SimulationStarted', state.id, {})],
    changes: [putChange(ctx, 'simulationState', { ...state, running: true })],
  }
}

/** Pauses the simulator clock. Emits `SimulationPaused`. */
export const pauseSimulation: Command<Record<string, never>> = async (ctx) => {
  const state = await current(ctx)
  if (!state.running) throw new InvalidCommandError('The simulation is not running')
  return {
    events: [buildEvent(ctx, 'SimulationPaused', state.id, {})],
    changes: [putChange(ctx, 'simulationState', { ...state, running: false })],
  }
}

/** Changes the simulation speed (1×, 10×, 60×, 300×). Emits `SimulationSpeedChanged`. */
export const setSimulationSpeed: Command<{ speed: SimulationSpeed }> = async (ctx, { speed }) => {
  if (!SIMULATION_SPEEDS.includes(speed)) {
    throw new InvalidCommandError(`Unsupported simulation speed ${String(speed)}`)
  }
  const state = await current(ctx)
  if (state.speed === speed) throw new InvalidCommandError(`Speed is already ${speed}×`)
  return {
    events: [buildEvent(ctx, 'SimulationSpeedChanged', state.id, { speed })],
    changes: [putChange(ctx, 'simulationState', { ...state, speed })],
  }
}

/**
 * Moves the simulated clock forward. This is the documented exception to "events first": the
 * clock is not a domain fact, so it is a state-only change (see `specs/domain.md` → Events).
 * Written with `EventStore.append([], [change])` by the simulator runner.
 */
export function advanceSimulation(state: SimulationState, simNow: IsoDateTime): Change {
  if (Date.parse(simNow) < Date.parse(state.simNow)) {
    throw new InvalidCommandError(`Simulated time cannot go back (${state.simNow} → ${simNow})`)
  }
  return {
    entity: 'simulationState',
    op: 'put',
    record: { ...state, simNow, updatedAt: simNow },
  }
}
