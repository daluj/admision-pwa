import type {
  Admission,
  Bed,
  BedRequest,
  EdVisit,
  Patient,
  Porter,
  Specialty,
  TransferRequest,
  Unit,
} from '@/domain/schemas'
import type { MinuteContext } from './types'

/** Read-only snapshot of the hospital taken at the start of a simulated minute. */
export type World = {
  beds: Bed[]
  bedById: Map<string, Bed>
  units: Unit[]
  unitById: Map<string, Unit>
  specialties: Specialty[]
  patients: Patient[]
  admissions: Admission[]
  bedRequests: BedRequest[]
  edVisits: EdVisit[]
  transfers: TransferRequest[]
  porters: Porter[]
}

export async function loadWorld({ backend }: MinuteContext): Promise<World> {
  const r = backend.repositories
  const [
    beds,
    units,
    specialties,
    patients,
    admissions,
    bedRequests,
    edVisits,
    transfers,
    porters,
  ] = await Promise.all([
    r.bed.list(),
    r.unit.list(),
    r.specialty.list(),
    r.patient.list(),
    r.admission.list(),
    r.bedRequest.list(),
    r.edVisit.list(),
    r.transferRequest.list(),
    r.porter.list(),
  ])
  return {
    beds,
    bedById: new Map(beds.map((b) => [b.id, b])),
    units,
    unitById: new Map(units.map((u) => [u.id, u])),
    specialties,
    patients,
    admissions,
    bedRequests,
    edVisits,
    transfers,
    porters,
  }
}

const byLabel = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** Stable ordering helper (ids are unique). */
export const sortedById = <T extends { id: string }>(items: readonly T[]): T[] =>
  [...items].sort(byLabel)
