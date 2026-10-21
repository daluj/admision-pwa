import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { useEd } from './useEd'

describe('useEd', () => {
  it('is undefined until the demo is seeded, then follows the data', async () => {
    const backend = createMemoryBackend()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DataProvider backend={backend}>{children}</DataProvider>
    )
    const { result } = renderHook(() => useEd(), { wrapper })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current).toBeUndefined()

    const NOW = '2026-10-21T10:00:00.000Z'
    await act(() =>
      backend.events.append(
        [],
        [
          {
            entity: 'simulationState',
            op: 'put',
            record: { ...sampleEntities.simulationState, simNow: NOW },
          },
          { entity: 'patient', op: 'put', record: sampleEntities.patient },
          {
            entity: 'edVisit',
            op: 'put',
            record: { ...sampleEntities.edVisit, arrivedAt: '2026-10-21T09:40:00.000Z' },
          },
        ],
      ),
    )
    await waitFor(() => expect(result.current?.ed.kpis.waitingTriage).toBe(1))
    expect(result.current).toMatchObject({ now: NOW, hasVisits: true })
    expect(result.current?.ed.kpis.oldestTriageWaitMs).toBe(20 * 60_000)

    await act(() =>
      backend.events.append(
        [],
        [
          {
            entity: 'edVisit',
            op: 'put',
            record: {
              ...sampleEntities.edVisit,
              arrivedAt: '2026-10-21T09:40:00.000Z',
              phase: 'TRIAGED',
              triageLevel: 3,
              triagedAt: '2026-10-21T09:50:00.000Z',
            },
          },
        ],
      ),
    )
    await waitFor(() => expect(result.current?.ed.kpis.waitingPhysician).toBe(1))
    expect(result.current?.ed.kpis.waitingTriage).toBe(0)
  })
})
