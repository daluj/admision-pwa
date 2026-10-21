import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import type { User } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { SessionProvider } from '@/features/auth/SessionProvider'
import { writeSession } from '@/features/auth/sessionStorage'
import { seedAdmissions } from '@/test/admissionsFixture'
import { useAdmissionsData } from './useAdmissionsData'

const user = (id: string, role: User['role'], unitId?: string): User => ({
  ...sampleEntities.user,
  id,
  username: id,
  displayName: id,
  role,
  ...(unitId ? { unitId } : {}),
})

async function load(who: User) {
  const backend = createMemoryBackend()
  await seedAdmissions(backend)
  await backend.events.append([], [{ entity: 'user', op: 'put', record: who }])
  writeSession(who.id)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DataProvider backend={backend}>
      <SessionProvider>{children}</SessionProvider>
    </DataProvider>
  )
  const hook = renderHook(() => useAdmissionsData(), { wrapper })
  await waitFor(() => expect(hook.result.current).toBeDefined())
  return hook.result.current!
}

afterEach(() => window.localStorage.clear())

describe('useAdmissionsData', () => {
  it('is undefined while loading', () => {
    const backend = createMemoryBackend()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DataProvider backend={backend}>
        <SessionProvider>{children}</SessionProvider>
      </DataProvider>
    )
    expect(renderHook(() => useAdmissionsData(), { wrapper }).result.current).toBeUndefined()
  })

  it('gives the head the whole hospital, including the cancellation reasons from the events', async () => {
    const result = await load(user('h', 'ADMISSIONS_HEAD'))
    expect(result.restricted).toBe(false)
    expect(result.data.kpis.expectedToday).toBe(5)
    expect(result.data.kpis.cancelledNoBed).toBe(1)
    expect(result.data.scheduled.find((r) => r.admission.id === 's4')?.cancelReason).toBe('NO_BED')
  })

  it('scopes a nurse supervisor to their unit and its specialties', async () => {
    const result = await load(user('n', 'NURSE_SUPERVISOR', 'u2'))
    expect(result).toMatchObject({ restricted: true, unitName: 'Medicina Interna 6ª Norte' })
    expect(result.data.byUnit.map((u) => u.unit.code)).toEqual(['MIN-6N'])
    expect(result.data.scheduled.map((r) => r.admission.id)).toEqual(['s7'])
  })

  it('fails closed for a supervisor without a unit', async () => {
    const result = await load(user('o', 'NURSE_SUPERVISOR'))
    expect(result.restricted).toBe(true)
    expect(result.unitName).toBeUndefined()
    expect(result.data.worklist).toEqual([])
    expect(result.data.scheduled).toEqual([])
    expect(result.data.kpis.expectedToday).toBe(0)
  })
})
