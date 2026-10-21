import {
  ADMIT_SHARE,
  BLOCKS_PER_DAY,
  DISCHARGE_SLIP_SHARE,
  MAX_ASSESSMENTS_PER_MINUTE,
} from './normalDay.config'

/**
 * How a scenario bends the normal-day policies. DATA ONLY (see `definitions.ts`); the policies
 * read it through an optional argument whose default is the normal day, so adding a scenario
 * never changes the behaviour of another one.
 */
export type ScenarioTuning = {
  /** Multiplies the expected ED arrivals per hour. */
  arrivalsMultiplier: number
  /** Share of assessed ED patients who are admitted. */
  admitShare: number
  /** Assessments doctors may start per minute. */
  assessmentsPerMinute: number
  /** Multiply the minutes of the respective step (> 1 = slower). */
  reserveDelayFactor: number
  transferDelayFactor: number
  cleaningDelayFactor: number
  dischargeDelayFactor: number
  /** Share of expected discharges that slip to the next day. */
  dischargeSlipShare: number
  /** Maintenance blocks per day. */
  blocksPerDay: number
}

export const NORMAL_TUNING: ScenarioTuning = {
  arrivalsMultiplier: 1,
  admitShare: ADMIT_SHARE,
  assessmentsPerMinute: MAX_ASSESSMENTS_PER_MINUTE,
  reserveDelayFactor: 1,
  transferDelayFactor: 1,
  cleaningDelayFactor: 1,
  dischargeDelayFactor: 1,
  dischargeSlipShare: DISCHARGE_SLIP_SHARE,
  blocksPerDay: BLOCKS_PER_DAY,
}

/** A `[min, max]` range of minutes stretched by `factor` (identical numbers at 1). */
export function scaleRange(
  range: readonly [number, number],
  factor: number,
): readonly [number, number] {
  if (factor === 1) return range
  const min = Math.round(range[0] * factor)
  return [min, Math.max(min, Math.round(range[1] * factor))]
}
