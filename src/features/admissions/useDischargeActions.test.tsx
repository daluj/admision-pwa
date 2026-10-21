import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import type { User } from '@/domain/schemas'
import { SessionProvider } from '@/features/auth/SessionProvider'
import { writeSession } from '@/features/auth/sessionStorage'
import { SimulationClockProvider } from '@/features/simulation/SimulationClockProvider'
import { es } from '@/i18n/es'
import { ADM_NOW, seedAdmissions } from '@/test/admissionsFixture'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { useDischargeActions, type DischargeRequest } from './useDischargeActions'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const user = (id: string, role: User['role'], unitId?: string): User => ({
  ...sampleEntities.user,
  id,
  username: id,
  displayName: id,
  role,
  ...(unitId ? { unitId } : {}),
})
const USERS = {
  head: user('usr-head', 'ADMISSIONS_HEAD'),
  nurseU1: user('usr-n1', 'NURSE_SUPERVISOR', 'u1'),
  nurseU2: user('usr-n2', 'NURSE_SUPERVISOR', 'u2'),
  orphan: user('usr-orphan', 'NURSE_SUPERVISOR'),
  bedManager: user('usr-bm', 'BED_MANAGER'),
}

async function setup(who: User) {
  const backend = createMemoryBackend()
  await seedAdmissions(backend)
  await backend.events.append(
    [],
    Object.values(USERS).map((record) => ({ entity: 'user' as const, op: 'put' as const, record })),
  )
  const baseline = await backend.events.lastSeq()
  writeSession(who.id)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DataProvider backend={backend}>
      <SessionProvider>
        <SimulationClockProvider>{children}</SimulationClockProvider>
      </SessionProvider>
    </DataProvider>
  )
  const hook = renderHook(() => useDischargeActions(), { wrapper })
  await waitFor(() =>
    expect(hook.result.current.canAct('order', 'u1')).toBe(
      who.role === 'ADMISSIONS_HEAD' || who.id === 'usr-n1',
    ),
  )
  return { backend, hook, baseline }
}

const perform = (hook: Awaited<ReturnType<typeof setup>>['hook'], request: DischargeRequest) =>
  act(() => hook.result.current.perform(request))

const FUTURE = '2026-10-21T16:00:00.000Z'

beforeEach(() => vi.clearAllMocks())
afterEach(() => window.localStorage.clear())

describe('useDischargeActions', () => {
  it('sets the expected discharge as the user, with the simulated time, and toasts', async () => {
    const { backend, hook } = await setup(USERS.head)
    const result = await perform(hook, {
      action: 'setExpected',
      admissionId: 'i4',
      expectedDischargeAt: FUTURE,
      label: 'B6 · A. B. C.',
    })
    expect(result).toEqual({ ok: true })
    expect((await backend.events.list()).at(-1)).toMatchObject({
      type: 'ExpectedDischargeSet',
      actor: 'usr-head',
      occurredAt: ADM_NOW,
      entityId: 'i4',
      payload: { expectedDischargeAt: FUTURE },
    })
    expect(await backend.repositories.admission.get('i4')).toMatchObject({
      expectedDischargeAt: FUTURE,
    })
    expect(toast.success).toHaveBeenCalledWith(
      es.pages.admissions.actions.toast.setExpected('B6 · A. B. C.'),
    )
  })

  it('orders a discharge', async () => {
    const { backend, hook } = await setup(USERS.head)
    expect(await perform(hook, { action: 'order', admissionId: 'i1', label: 'B1' })).toEqual({
      ok: true,
    })
    expect((await backend.events.list()).at(-1)).toMatchObject({
      type: 'DischargeOrdered',
      entityId: 'i1',
    })
    expect(await backend.repositories.admission.get('i1')).toMatchObject({
      status: 'DISCHARGE_ORDERED',
    })
  })

  it('a supervisor acts on their own unit (i1 is in u1) and is refused elsewhere (i4 is in u2)', async () => {
    const { backend, hook, baseline } = await setup(USERS.nurseU1)
    expect(await perform(hook, { action: 'order', admissionId: 'i4', label: 'B6' })).toMatchObject({
      ok: false,
      reason: 'forbidden',
    })
    expect(await backend.events.lastSeq()).toBe(baseline)
    expect(await perform(hook, { action: 'order', admissionId: 'i1', label: 'B1' })).toEqual({
      ok: true,
    })
    expect((await backend.events.list()).at(-1)).toMatchObject({ actor: 'usr-n1' })
  })

  it.each([
    ['a supervisor without a unit', USERS.orphan],
    ['a bed manager', USERS.bedManager],
  ])('%s can do nothing', async (_name, who) => {
    const { backend, hook, baseline } = await setup(who)
    expect(await perform(hook, { action: 'order', admissionId: 'i1', label: 'B1' })).toMatchObject({
      ok: false,
      reason: 'forbidden',
    })
    expect(
      await perform(hook, {
        action: 'setExpected',
        admissionId: 'i1',
        expectedDischargeAt: FUTURE,
        label: 'B1',
      }),
    ).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(await backend.events.lastSeq()).toBe(baseline)
  })

  it('stale input is reported, not crashed: unknown patient, already ordered, invalid time', async () => {
    const { backend, hook, baseline } = await setup(USERS.head)
    expect(await perform(hook, { action: 'order', admissionId: 'nope', label: '?' })).toMatchObject(
      { ok: false, reason: 'stale' },
    )
    expect(await perform(hook, { action: 'order', admissionId: 'i2', label: 'B2' })).toMatchObject({
      ok: false,
      reason: 'stale',
    }) // already DISCHARGE_ORDERED
    expect(
      await perform(hook, {
        action: 'setExpected',
        admissionId: 'i1',
        expectedDischargeAt: '2026-10-21T09:00:00.000Z',
        label: 'B1',
      }),
    ).toMatchObject({ ok: false, reason: 'stale' }) // past
    expect(await backend.events.lastSeq()).toBe(baseline)
    expect(toast.success).not.toHaveBeenCalled()
  })
})
