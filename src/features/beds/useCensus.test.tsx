import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { useCensus } from './useCensus'

describe('useCensus', () => {
  it('is undefined until the demo is seeded, then follows the data', async () => {
    const backend = createMemoryBackend()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DataProvider backend={backend}>{children}</DataProvider>
    )
    const { result } = renderHook(() => useCensus(), { wrapper })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current).toBeUndefined()

    await act(() =>
      backend.events.append(
        [],
        [
          { entity: 'simulationState', op: 'put', record: sampleEntities.simulationState },
          { entity: 'unit', op: 'put', record: sampleEntities.unit },
          {
            entity: 'bed',
            op: 'put',
            record: { ...sampleEntities.bed, unitId: sampleEntities.unit.id },
          },
        ],
      ),
    )
    await waitFor(() => expect(result.current?.census.hospital.counts.total).toBe(1))
    expect(result.current?.now).toBe(sampleEntities.simulationState.simNow)

    await act(() =>
      backend.events.append(
        [],
        [
          {
            entity: 'bed',
            op: 'put',
            record: {
              ...sampleEntities.bed,
              unitId: sampleEntities.unit.id,
              status: 'BLOCKED',
              blockedReason: 'x',
            },
          },
        ],
      ),
    )
    await waitFor(() => expect(result.current?.census.hospital.counts.BLOCKED).toBe(1))
  })
})
