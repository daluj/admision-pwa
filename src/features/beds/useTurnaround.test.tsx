import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import type { NewHospitalEvent } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { useTurnaround } from './useTurnaround'

const event = (
  n: number,
  type: 'PatientDischarged' | 'BedCleaningFinished',
  at: string,
): NewHospitalEvent =>
  ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    type,
    occurredAt: at,
    actor: 'simulator',
    entityType: type === 'PatientDischarged' ? 'Admission' : 'Bed',
    entityId: type === 'PatientDischarged' ? 'adm-1' : 'b1',
    payload: type === 'PatientDischarged' ? { bedId: 'b1' } : {},
  }) as NewHospitalEvent

describe('useTurnaround', () => {
  it('is undefined until seeded, then follows the log', async () => {
    const backend = createMemoryBackend()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DataProvider backend={backend}>{children}</DataProvider>
    )
    const bedIds = new Set(['b1'])
    const { result } = renderHook(() => useTurnaround(bedIds), { wrapper })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current).toBeUndefined()

    await act(() =>
      backend.events.append(
        [
          event(1, 'PatientDischarged', '2026-10-21T07:00:00.000Z'),
          event(2, 'BedCleaningFinished', '2026-10-21T08:30:00.000Z'),
        ],
        [
          {
            entity: 'simulationState',
            op: 'put',
            record: { ...sampleEntities.simulationState, simNow: '2026-10-21T09:00:00.000Z' },
          },
        ],
      ),
    )
    await waitFor(() => expect(result.current).toEqual({ medianMs: 90 * 60_000, count: 1 }))
  })
})
