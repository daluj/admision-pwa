import { createRng, type Rng } from '@/simulator/random/prng'

/** Stream tied to (seed, stage, entity): the same entity always draws the same numbers. */
export function entityRng(seed: number, stage: string, id: string): Rng {
  return createRng(seed).fork(`${stage}:${id}`)
}

/** Deterministic integer in `[min, max]` for an entity at a stage (e.g. its triage delay). */
export function entityInt(
  seed: number,
  stage: string,
  id: string,
  [min, max]: readonly [number, number],
): number {
  return entityRng(seed, stage, id).int(min, max)
}

export function entityChance(seed: number, stage: string, id: string, p: number): boolean {
  return entityRng(seed, stage, id).chance(p)
}

/** Minute of the local day (within `[fromHour, toHour]`) at which an entity "acts" each day. */
export function entitySlot(
  seed: number,
  stage: string,
  id: string,
  [fromHour, toHour]: readonly [number, number],
): number {
  return entityRng(seed, stage, id).int(fromHour * 60, toHour * 60)
}

export const minutesBetween = (fromIso: string, toIso: string): number =>
  (Date.parse(toIso) - Date.parse(fromIso)) / 60_000
