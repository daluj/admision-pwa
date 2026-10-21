import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { Change, DataBackend } from '@/data/ports'
import type {
  Admission,
  Bed,
  BedRequest,
  EdVisit,
  HospitalEvent,
  Porter,
  TransferRequest,
} from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { advanceSimulationTo } from '@/simulator/runner'
import { localTime, type LocalTime } from '@/simulator/scenarios/localTime'
import type { MinuteContext, Scenario } from '@/simulator/scenarios/types'
import { loadWorld, type World } from '@/simulator/scenarios/world'
import { seedMiniHospital, createCommandHarness } from './commandHarness'

export const T0 = '2026-10-21T08:00:00.000Z' // 10:00 in Madrid
const stamp = { createdAt: T0, updatedAt: T0 }

export type Policy = (ctx: MinuteContext, world: World, local: LocalTime) => Promise<void>

/** A scenario made of just the given policies (each gets the minute's world snapshot). */
export function policies(...fns: Policy[]): Scenario {
  return {
    id: 'test-policies',
    step: async (ctx) => {
      const world = await loadWorld(ctx)
      const local = localTime(ctx.at)
      for (const fn of fns) await fn(ctx, world, local)
    },
  }
}

export type ScenarioHarness = {
  backend: DataBackend
  /** Writes rows directly (test setup). */
  put: (...changes: Change[]) => Promise<void>
  /** Plays `scenario` for `minutes` simulated minutes from the current `simNow`. */
  play: (scenario: Scenario, minutes: number) => Promise<void>
  events: (type?: HospitalEvent['type']) => Promise<HospitalEvent[]>
  now: () => Promise<string>
}

export async function createScenarioHarness(start: string = T0): Promise<ScenarioHarness> {
  const h = createCommandHarness({ start, backend: createMemoryBackend({ validateSchemas: true }) })
  await seedMiniHospital(h)
  const { backend } = h
  const put = (...changes: Change[]) => backend.events.append([], changes).then(() => undefined)
  await put({
    entity: 'simulationState',
    op: 'put',
    record: { ...sampleEntities.simulationState, simNow: start, startedAt: start, seed: 7 },
  })
  const now = async () => (await backend.repositories.simulationState.get('current'))!.simNow
  return {
    backend,
    put,
    now,
    play: async (scenario, minutes) =>
      advanceSimulationTo(
        backend,
        scenario,
        new Date(Date.parse(await now()) + minutes * 60_000).toISOString(),
      ),
    events: async (type) => (await backend.events.list()).filter((e) => !type || e.type === type),
  }
}

export const putBed = (bed: Partial<Bed> & { id: string }): Change => ({
  entity: 'bed',
  op: 'put',
  record: { ...sampleEntities.bed, unitId: 'unit-ward', label: bed.id, ...bed },
})

export const putVisit = (visit: Partial<EdVisit> & { id: string }): Change => ({
  entity: 'edVisit',
  op: 'put',
  record: { ...sampleEntities.edVisit, arrivedAt: T0, ...visit },
})

export const putPatient = (id: string, n: number): Change => ({
  entity: 'patient',
  op: 'put',
  record: { ...sampleEntities.patient, id, mrn: `SIM-T${n}` },
})

export const putAdmission = (admission: Partial<Admission> & { id: string }): Change => ({
  entity: 'admission',
  op: 'put',
  record: { ...sampleEntities.admission, edVisitId: undefined, ...admission },
})

export const putRequest = (request: Partial<BedRequest> & { id: string }): Change => ({
  entity: 'bedRequest',
  op: 'put',
  record: { ...sampleEntities.bedRequest, requestedAt: T0, ...request },
})

export const putTransfer = (transfer: Partial<TransferRequest> & { id: string }): Change => ({
  entity: 'transferRequest',
  op: 'put',
  record: { ...sampleEntities.transferRequest, ...transfer },
})

export const putPorter = (porter: Partial<Porter> & { id: string }): Change => ({
  entity: 'porter',
  op: 'put',
  record: { ...sampleEntities.porter, ...porter, ...stamp },
})
