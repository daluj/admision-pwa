import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import type { Change, DataBackend } from '@/data/ports'
import type { User } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { SessionProvider } from '@/features/auth/SessionProvider'
import { writeSession } from '@/features/auth/sessionStorage'
import { SimulationClockProvider } from '@/features/simulation/SimulationClockProvider'
import { es } from '@/i18n/es'
import { useBedActions, type BedActionRequest } from './useBedActions'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const NOW = '2026-10-21T08:00:00.000Z'
const stamp = { createdAt: NOW, updatedAt: NOW }
const user = (id: string, role: User['role'], unitId?: string): User => ({
  ...stamp,
  id,
  username: id,
  displayName: id,
  role,
  ...(unitId ? { unitId } : {}),
})
const USERS = {
  head: user('usr-head', 'ADMISSIONS_HEAD'),
  nurse: user('usr-nurse', 'NURSE_SUPERVISOR', 'unit-ward'),
  nurseIcu: user('usr-nurse-icu', 'NURSE_SUPERVISOR', 'unit-icu'),
  management: user('usr-mgmt', 'MANAGEMENT'),
}

const unit = (id: string, code: string, type: 'WARD' | 'ICU') => ({
  ...sampleEntities.unit,
  id,
  code,
  name: code,
  type,
})
const bed = (id: string, status: string, extra = {}) => ({
  ...sampleEntities.bed,
  id,
  unitId: 'unit-ward',
  label: id,
  status,
  statusChangedAt: NOW,
  ...extra,
})

const rows: Change[] = [
  {
    entity: 'simulationState',
    op: 'put',
    record: { ...sampleEntities.simulationState, simNow: NOW },
  },
  { entity: 'unit', op: 'put', record: unit('unit-ward', 'W-1', 'WARD') },
  { entity: 'unit', op: 'put', record: unit('unit-icu', 'ICU-1', 'ICU') },
  { entity: 'bed', op: 'put', record: bed('b-free', 'AVAILABLE') as never },
  { entity: 'bed', op: 'put', record: bed('b-dirty', 'PENDING_CLEANING') as never },
  { entity: 'patient', op: 'put', record: sampleEntities.patient },
  {
    entity: 'admission',
    op: 'put',
    record: { ...sampleEntities.admission, id: 'a1', edVisitId: undefined },
  },
  {
    entity: 'bedRequest',
    op: 'put',
    record: { ...sampleEntities.bedRequest, id: 'r1', admissionId: 'a1', requestedAt: NOW },
  },
  ...Object.values(USERS).map((record): Change => ({ entity: 'user', op: 'put', record })),
]

async function setup(who: User) {
  const backend = createMemoryBackend()
  await backend.events.append([], rows)
  writeSession(who.id)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DataProvider backend={backend}>
      <SessionProvider>
        <SimulationClockProvider>{children}</SimulationClockProvider>
      </SessionProvider>
    </DataProvider>
  )
  const hook = renderHook(() => useBedActions(), { wrapper })
  // Wait until the session has resolved to a real user.
  await waitFor(() =>
    expect(hook.result.current.canAct('block', 'unit-ward')).toBe(who.role === 'ADMISSIONS_HEAD'),
  )
  return { backend, hook }
}

const perform = (hook: Awaited<ReturnType<typeof setup>>['hook'], request: BedActionRequest) =>
  act(() => hook.result.current.perform(request))

const lastEvent = async (backend: DataBackend) => (await backend.events.list()).at(-1)

beforeEach(() => vi.clearAllMocks())
afterEach(() => window.localStorage.clear())

describe('useBedActions', () => {
  it('runs the command as the user and toasts the result', async () => {
    const { backend, hook } = await setup(USERS.head)
    const result = await perform(hook, {
      action: 'reserve',
      bedRequestId: 'r1',
      bedId: 'b-free',
      unitId: 'unit-ward',
      bedLabel: '512-A',
      initials: 'M. G. R.',
    })
    expect(result).toEqual({ ok: true })
    expect(await lastEvent(backend)).toMatchObject({
      type: 'BedReserved',
      actor: 'usr-head',
      occurredAt: NOW,
      entityId: 'b-free',
    })
    expect(await backend.repositories.bedRequest.get('r1')).toMatchObject({
      status: 'ASSIGNED',
      etaAt: '2026-10-21T08:30:00.000Z',
    })
    expect(toast.success).toHaveBeenCalledWith('Cama 512-A reservada para M. G. R.')
  })

  it.each([
    ['block', { reason: 'Avería' }, 'b-free', 'BedBlocked', 'Cama b-free bloqueada'],
    ['startCleaning', {}, 'b-dirty', 'BedCleaningStarted', 'Cama b-dirty: limpieza iniciada'],
  ] as const)('%s appends %s', async (action, extra, bedId, type, message) => {
    const { backend, hook } = await setup(USERS.head)
    const result = await perform(hook, {
      action,
      bedId,
      unitId: 'unit-ward',
      bedLabel: bedId,
      ...extra,
    } as BedActionRequest)
    expect(result).toEqual({ ok: true })
    expect(await lastEvent(backend)).toMatchObject({ type, actor: 'usr-head' })
    expect(toast.success).toHaveBeenCalledWith(message)
  })

  it('refuses forbidden actions without writing anything', async () => {
    const { backend, hook } = await setup(USERS.management)
    const result = await perform(hook, {
      action: 'block',
      bedId: 'b-free',
      unitId: 'unit-ward',
      bedLabel: 'b-free',
      reason: 'x',
    })
    expect(result).toEqual({
      ok: false,
      reason: 'forbidden',
      message: es.pages.beds.actions.errors.forbidden,
    })
    expect(await backend.events.lastSeq()).toBe(0)
    expect(await backend.repositories.bed.get('b-free')).toMatchObject({ status: 'AVAILABLE' })
  })

  it('lets a nurse supervisor clean in their unit but not block, nor clean elsewhere', async () => {
    const { backend, hook } = await setup(USERS.nurse)
    expect(hook.result.current.canAct('startCleaning', 'unit-ward')).toBe(true)
    expect(hook.result.current.canAct('startCleaning', 'unit-icu')).toBe(false)
    expect(hook.result.current.canAct('block', 'unit-ward')).toBe(false)

    expect(
      await perform(hook, {
        action: 'block',
        bedId: 'b-free',
        unitId: 'unit-ward',
        bedLabel: 'b-free',
        reason: 'x',
      }),
    ).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(
      await perform(hook, {
        action: 'startCleaning',
        bedId: 'b-dirty',
        unitId: 'unit-icu',
        bedLabel: 'b-dirty',
      }),
    ).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(await backend.events.lastSeq()).toBe(0)

    expect(
      await perform(hook, {
        action: 'startCleaning',
        bedId: 'b-dirty',
        unitId: 'unit-ward',
        bedLabel: 'b-dirty',
      }),
    ).toEqual({ ok: true })
    expect(await lastEvent(backend)).toMatchObject({
      type: 'BedCleaningStarted',
      actor: 'usr-nurse',
    })
  })

  it('reports a stale request or bed as "stale" and writes nothing', async () => {
    const { backend, hook } = await setup(USERS.head)
    await backend.events.append(
      [],
      [
        {
          entity: 'bedRequest',
          op: 'put',
          record: { ...sampleEntities.bedRequest, id: 'r1', admissionId: 'a1', status: 'ASSIGNED' },
        },
      ],
    )
    const before = await backend.events.lastSeq()
    const result = await perform(hook, {
      action: 'reserve',
      bedRequestId: 'r1',
      bedId: 'b-free',
      unitId: 'unit-ward',
      bedLabel: 'b-free',
    })
    expect(result).toEqual({
      ok: false,
      reason: 'stale',
      message: es.pages.beds.actions.errors.stale,
    })
    expect(await backend.events.lastSeq()).toBe(before)
    expect(toast.success).not.toHaveBeenCalled()

    // A bed that is no longer in the right state is just as stale.
    const dirty = await perform(hook, {
      action: 'finishCleaning',
      bedId: 'b-dirty',
      unitId: 'unit-ward',
      bedLabel: 'b-dirty',
    })
    expect(dirty).toMatchObject({ ok: false, reason: 'stale' })
  })
})
