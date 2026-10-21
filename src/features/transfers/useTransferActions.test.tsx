import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import { sampleEntities } from '@/domain/schemas/fixtures'
import type { User } from '@/domain/schemas'
import { SessionProvider } from '@/features/auth/SessionProvider'
import { writeSession } from '@/features/auth/sessionStorage'
import { SimulationClockProvider } from '@/features/simulation/SimulationClockProvider'
import { es } from '@/i18n/es'
import { seedTransfers, TR_NOW } from '@/test/transfersFixture'
import { useTransferActions, type TransferRequestAction } from './useTransferActions'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const user = (id: string, role: User['role'], porterId?: string): User => ({
  ...sampleEntities.user,
  id,
  username: id,
  displayName: id,
  role,
  ...(porterId ? { porterId } : {}),
})
const USERS = {
  head: user('usr-head', 'ADMISSIONS_HEAD'),
  bedManager: user('usr-bm', 'BED_MANAGER'),
  nurse: user('usr-n', 'NURSE_SUPERVISOR'),
  porterA: user('usr-pa', 'PORTER', 'por-a'),
  porterC: user('usr-pc', 'PORTER', 'por-c'),
  porterNone: user('usr-p0', 'PORTER'),
}

async function setup(who: User) {
  const backend = createMemoryBackend()
  await seedTransfers(backend)
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
  const hook = renderHook(() => useTransferActions(), { wrapper })
  // The session resolves asynchronously: wait until the role is known.
  await waitFor(() =>
    expect(hook.result.current.canAct('create')).toBe(
      who.role === 'ADMISSIONS_HEAD' || who.role === 'BED_MANAGER',
    ),
  )
  return { backend, hook, baseline }
}
type Setup = Awaited<ReturnType<typeof setup>>
const perform = (hook: Setup['hook'], request: TransferRequestAction) =>
  act(() => hook.result.current.perform(request))
const newEvents = async (s: Setup) =>
  (await s.backend.events.list()).filter((e) => e.seq > s.baseline).map((e) => e.type)

beforeEach(() => localStorage.clear())
afterEach(() => vi.clearAllMocks())

describe('useTransferActions', () => {
  it('lets the head assign an available porter, stamped with the simulated time', async () => {
    const s = await setup(USERS.head)
    const result = await perform(s.hook, {
      action: 'assign',
      transferId: 't2',
      porterId: 'por-a',
      label: 'X',
    })
    expect(result).toEqual({ ok: true })
    const t = await s.backend.repositories.transferRequest.get('t2')
    expect(t).toMatchObject({ status: 'ASSIGNED', porterId: 'por-a', assignedAt: TR_NOW })
    expect(await newEvents(s)).toEqual(['TransferAssigned'])
    expect(toast.success).toHaveBeenCalledWith(es.pages.transfers.actions.toast.assign('X'))
  })

  it('creates a transfer for a patient', async () => {
    const s = await setup(USERS.bedManager)
    const result = await perform(s.hook, {
      action: 'create',
      label: 'Y',
      input: {
        patientId: 'p-t1',
        fromLocation: { kind: 'OTHER', label: 'Planta 1' },
        toLocation: { kind: 'RADIOLOGY', label: 'Radiología' },
        reason: 'TEST',
        priority: 'NORMAL',
      },
    })
    expect(result).toEqual({ ok: true })
    expect(await newEvents(s)).toEqual(['TransferRequested'])
  })

  it('cancels an open transfer and frees the porter', async () => {
    const s = await setup(USERS.head)
    expect(await perform(s.hook, { action: 'cancel', transferId: 't3', label: 'Z' })).toEqual({
      ok: true,
    })
    expect((await s.backend.repositories.transferRequest.get('t3'))!.status).toBe('CANCELLED')
    expect((await s.backend.repositories.porter.get('por-c'))!.status).toBe('AVAILABLE')
  })

  it('a porter accepts an open transfer for their own porter', async () => {
    const s = await setup(USERS.porterA)
    expect(await perform(s.hook, { action: 'accept', transferId: 't2', label: 'A' })).toEqual({
      ok: true,
    })
    expect(await s.backend.repositories.transferRequest.get('t2')).toMatchObject({
      status: 'ASSIGNED',
      porterId: 'por-a',
    })
  })

  it('a porter moves only their own job forward', async () => {
    const s = await setup(USERS.porterC)
    expect(await perform(s.hook, { action: 'pickUp', transferId: 't3', label: 'A' })).toEqual({
      ok: true,
    })
    expect(await perform(s.hook, { action: 'deliver', transferId: 't3', label: 'A' })).toEqual({
      ok: true,
    })
    expect(await newEvents(s)).toEqual(['TransferPickedUp', 'TransferDelivered'])
    expect((await s.backend.repositories.porter.get('por-c'))!.status).toBe('AVAILABLE')
  })

  it("refuses another porter's job, without writing", async () => {
    const s = await setup(USERS.porterA)
    const result = await perform(s.hook, { action: 'pickUp', transferId: 't3', label: 'A' })
    expect(result).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(await newEvents(s)).toEqual([])
  })

  it('fails closed for a porter login without a linked porter, and for other roles', async () => {
    const none = await setup(USERS.porterNone)
    expect(
      await perform(none.hook, { action: 'accept', transferId: 't2', label: 'A' }),
    ).toMatchObject({ reason: 'forbidden' })
    const nurse = await setup(USERS.nurse)
    expect(
      await perform(nurse.hook, {
        action: 'assign',
        transferId: 't2',
        porterId: 'por-a',
        label: 'A',
      }),
    ).toMatchObject({ reason: 'forbidden' })
    expect(await newEvents(none)).toEqual([])
  })

  it('reports stale input: unknown transfer, busy porter, already assigned', async () => {
    const s = await setup(USERS.head)
    expect(
      await perform(s.hook, { action: 'cancel', transferId: 'nope', label: 'A' }),
    ).toMatchObject({ reason: 'stale' })
    expect(
      await perform(s.hook, { action: 'assign', transferId: 't2', porterId: 'por-c', label: 'A' }),
    ).toMatchObject({ reason: 'stale' }) // busy
    expect(
      await perform(s.hook, { action: 'assign', transferId: 't3', porterId: 'por-a', label: 'A' }),
    ).toMatchObject({ reason: 'stale' }) // already assigned
    expect(await newEvents(s)).toEqual([])
  })
})
