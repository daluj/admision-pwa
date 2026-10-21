import { createFixedClock, type FixedClock } from '@/data/adapters/clock/fixedClock'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { Change, DataBackend } from '@/data/ports'
import { executeCommand, type ExecuteDeps } from '@/domain/commands/execute'
import type { Command } from '@/domain/commands/types'
import type { Bed, HospitalEvent } from '@/domain/schemas'

/** Deterministic UUID-shaped ids: `00000000-0000-4000-8000-000000000001`, … */
export function counterIds(start = 1): () => string {
  let n = start
  return () => `00000000-0000-4000-8000-${String(n++).padStart(12, '0')}`
}

export type CommandHarness = {
  backend: DataBackend
  clock: FixedClock
  deps: ExecuteDeps
  /** Runs a command against the harness backend. */
  run: <Input>(command: Command<Input>, input: Input) => Promise<HospitalEvent[]>
}

/** Memory backend + fixed clock + counter ids, for command tests. Schema validation is on. */
export function createCommandHarness(
  options: { start?: string; backend?: DataBackend } = {},
): CommandHarness {
  const backend = options.backend ?? createMemoryBackend({ validateSchemas: true })
  const clock = createFixedClock(options.start)
  const deps: ExecuteDeps = { backend, clock, newId: counterIds(1000) }
  return { backend, clock, deps, run: (command, input) => executeCommand(deps, command, input) }
}

const T0 = '2026-10-21T08:00:00.000Z'
const stamp = { createdAt: T0, updatedAt: T0 }

/** A tiny hospital: specialty CAR, a ward and an ICU with beds, one porter. Ids are readable. */
export async function seedMiniHospital(h: CommandHarness): Promise<void> {
  const bed = (id: string, unitId: string, extra: Partial<Bed> = {}): Bed => ({
    id,
    ...stamp,
    unitId,
    label: id,
    status: 'AVAILABLE',
    statusChangedAt: T0,
    ...extra,
  })
  await h.backend.events.append(
    [],
    (
      [
        {
          entity: 'specialty',
          record: { id: 'spec-car', ...stamp, code: 'CAR', name: 'Cardiología' },
        },
        {
          entity: 'unit',
          record: {
            id: 'unit-ward',
            ...stamp,
            code: 'W-1',
            name: 'Planta 1',
            building: 'Norte',
            floor: 1,
            type: 'WARD',
            specialtyCodes: ['CAR'],
            capacity: 3,
          },
        },
        {
          entity: 'unit',
          record: {
            id: 'unit-icu',
            ...stamp,
            code: 'ICU-1',
            name: 'UCI',
            building: 'Norte',
            floor: 0,
            type: 'ICU',
            specialtyCodes: ['CAR'],
            capacity: 1,
          },
        },
        { entity: 'bed', record: bed('bed-1', 'unit-ward') },
        { entity: 'bed', record: bed('bed-2', 'unit-ward') },
        { entity: 'bed', record: bed('bed-iso', 'unit-ward', { isolation: true }) },
        { entity: 'bed', record: bed('bed-icu', 'unit-icu') },
        {
          entity: 'porter',
          record: {
            id: 'por-1',
            ...stamp,
            name: 'Celador Uno',
            shift: 'MORNING',
            status: 'AVAILABLE',
          },
        },
      ] as const
    ).map((c) => ({ entity: c.entity, op: 'put' as const, record: c.record }) as Change),
  )
}
