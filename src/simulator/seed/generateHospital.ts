import type { EntityName, EntityOf, IsoDateTime } from '@/domain/schemas'
import { createRng } from '../random/prng'
import { generateCensus } from './generateCensus'
import { generateEd } from './generateEd'
import { generateStructure } from './generateStructure'
import { DEFAULT_PROFILE, type HospitalProfile } from './hospital'

/** Every row of the synthetic hospital at the anchor, keyed by entity name. */
export type HospitalSnapshot = { [N in EntityName]: EntityOf<N>[] }

export type GenerateHospitalInput = {
  seed: number
  /** Simulated "now" of the snapshot (08:00 Madrid in the app). */
  anchorAt: IsoDateTime
  profile?: HospitalProfile
  /** Scenario the run starts with (`SimulationState.scenarioId`). */
  scenarioId?: string
}

/** Pure: same input ⇒ same snapshot. */
export function generateHospital({
  seed,
  anchorAt,
  profile = DEFAULT_PROFILE,
  scenarioId = 'normal-day',
}: GenerateHospitalInput): HospitalSnapshot {
  const rng = createRng(seed)
  const structure = generateStructure(profile, rng, anchorAt)
  const usedMrns = new Set<string>()
  const census = generateCensus(profile, structure, rng, anchorAt, usedMrns)
  const flows = generateEd(profile, structure, census, rng, anchorAt, usedMrns)

  return {
    specialty: structure.specialties,
    unit: structure.units,
    bed: flows.beds,
    patient: [...census.patients, ...flows.patients],
    edVisit: flows.edVisits,
    admission: [...census.admissions, ...flows.admissions],
    bedRequest: flows.bedRequests,
    transferRequest: flows.transferRequests,
    porter: structure.porters,
    user: structure.users,
    alert: [],
    simulationState: [
      {
        id: 'current',
        createdAt: anchorAt,
        updatedAt: anchorAt,
        seed,
        scenarioId,
        speed: 60,
        running: false,
        simNow: anchorAt,
        startedAt: anchorAt,
      },
    ],
  }
}
