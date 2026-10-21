import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import type { DataBackend } from '@/data/ports'
import { sampleEntities } from '@/domain/schemas/fixtures'
import type { User } from '@/domain/schemas'
import { SessionProvider } from './SessionProvider'
import { SESSION_STORAGE_KEY, clearSession, readSession, writeSession } from './sessionStorage'
import { useSession } from './useSession'
import { useUnitScope } from './useUnitScope'

const head: User = { ...sampleEntities.user, role: 'ADMISSIONS_HEAD', unitId: undefined }
const nurse: User = {
  ...sampleEntities.user,
  id: '11111111-1111-4111-8111-111111111111',
  username: 'nurse',
  role: 'NURSE_SUPERVISOR',
  unitId: sampleEntities.unit.id,
}

async function backendWith(users: User[]): Promise<DataBackend> {
  const backend = createMemoryBackend()
  await backend.events.append(
    [],
    users.map((record) => ({ entity: 'user', op: 'put', record })),
  )
  return backend
}

const wrapperFor = (backend: DataBackend) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DataProvider backend={backend}>
        <SessionProvider>{children}</SessionProvider>
      </DataProvider>
    )
  }

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('sessionStorage', () => {
  it('round-trips and clears', () => {
    writeSession('abc')
    expect(readSession()).toBe('abc')
    clearSession()
    expect(readSession()).toBeNull()
  })

  it('ignores corrupt values', () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, '{not json')
    expect(readSession()).toBeNull()
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 5 }))
    expect(readSession()).toBeNull()
  })

  it('tolerates unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(readSession()).toBeNull()
    expect(() => writeSession('x')).not.toThrow()
    expect(() => clearSession()).not.toThrow()
  })
})

describe('SessionProvider', () => {
  it('starts anonymous, then logs in and out', async () => {
    const backend = await backendWith([head])
    const { result } = renderHook(() => useSession(), { wrapper: wrapperFor(backend) })
    await waitFor(() => expect(result.current.status).toBe('anonymous'))

    act(() => {
      if (result.current.status === 'anonymous') result.current.login(head.id)
    })
    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(readSession()).toBe(head.id)
    if (result.current.status === 'authenticated') {
      expect(result.current.can('settings')).toBe(true)
    }

    act(() => {
      if (result.current.status === 'authenticated') result.current.logout()
    })
    await waitFor(() => expect(result.current.status).toBe('anonymous'))
    expect(readSession()).toBeNull()
  })

  it('restores a stored session', async () => {
    writeSession(head.id)
    const backend = await backendWith([head])
    const { result } = renderHook(() => useSession(), { wrapper: wrapperFor(backend) })
    await waitFor(() => expect(result.current.status).toBe('authenticated'))
  })

  it('drops a session whose user no longer exists', async () => {
    writeSession('00000000-0000-4000-8000-00000000dead')
    const backend = await backendWith([head])
    const { result } = renderHook(() => useSession(), { wrapper: wrapperFor(backend) })
    await waitFor(() => expect(result.current.status).toBe('anonymous'))
    expect(readSession()).toBeNull()
  })

  it('keeps a nurse supervisor without a unit restricted (fails closed)', async () => {
    const orphan: User = {
      ...nurse,
      id: '22222222-2222-4222-8222-222222222222',
      username: 'orphan',
      unitId: undefined,
    }
    writeSession(orphan.id)
    const backend = await backendWith([orphan])
    const { result } = renderHook(() => useUnitScope(), { wrapper: wrapperFor(backend) })
    await waitFor(() => expect(result.current).toEqual({ restricted: true, unitId: null }))
  })

  it('scopes only nurse supervisors to their unit', async () => {
    writeSession(nurse.id)
    const backend = await backendWith([head, nurse])
    const { result } = renderHook(() => useUnitScope(), { wrapper: wrapperFor(backend) })
    await waitFor(() => expect(result.current).toEqual({ restricted: true, unitId: nurse.unitId }))

    act(() => writeSession(head.id))
    const other = renderHook(() => useUnitScope(), { wrapper: wrapperFor(backend) })
    await waitFor(() => expect(other.result.current).toEqual({ restricted: false }))
  })
})
