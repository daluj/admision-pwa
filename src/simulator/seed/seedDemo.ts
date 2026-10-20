import { ConcurrencyError, type DataBackend } from '@/data/ports'
import { resetDemo as resetDemoCommand } from '@/domain/commands'
import type { HospitalEvent } from '@/domain/schemas'
import { HOSPITAL_TIME_ZONE, zonedDayAt } from '@/lib/time'
import { createRng } from '../random/prng'
import { generateHospital } from './generateHospital'
import { DEFAULT_PROFILE, type HospitalProfile } from './hospital'

export const DEFAULT_SEED = 42
export const MAX_SEED = 999_999

/** The demo starts at 08:00 Europe/Madrid of the current (clock) day. */
export function demoAnchor(backend: DataBackend): string {
  return zonedDayAt(backend.clock.now(), HOSPITAL_TIME_ZONE, 8)
}

function buildDemo(backend: DataBackend, seed: number, profile: HospitalProfile) {
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    throw new RangeError(`Seed must be an integer between 0 and ${MAX_SEED}`)
  }
  const anchorAt = demoAnchor(backend)
  return resetDemoCommand({
    snapshot: generateHospital({ seed, anchorAt, profile }),
    seed,
    profileId: profile.profileId,
    anchorAt,
    eventId: createRng(seed).fork('event-ids').uuid(),
  })
}

/** "Restablecer demo": wipes everything (events included) and loads the hospital for `seed`. */
export async function resetDemo(
  backend: DataBackend,
  seed: number,
  profile: HospitalProfile = DEFAULT_PROFILE,
): Promise<HospitalEvent[]> {
  const { events, changes } = buildDemo(backend, seed, profile)
  return backend.events.reset(events, changes)
}

export type EnsureResult = 'seeded' | 'already-seeded'

/**
 * First launch: seeds only when the store is empty. Safe to call on every start and from several
 * tabs at once — the `expectedLastSeq: 0` guard lets exactly one writer win.
 */
export async function ensureDemoSeeded(
  backend: DataBackend,
  seed: number = DEFAULT_SEED,
  profile: HospitalProfile = DEFAULT_PROFILE,
): Promise<EnsureResult> {
  if ((await backend.events.lastSeq()) > 0) return 'already-seeded'
  const { events, changes } = buildDemo(backend, seed, profile)
  try {
    await backend.events.append(events, changes, { expectedLastSeq: 0 })
    return 'seeded'
  } catch (error) {
    if (error instanceof ConcurrencyError) return 'already-seeded'
    throw error
  }
}
