import { act, renderHook, waitFor } from '@testing-library/react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import type { DataBackend, Subscribable } from '@/data/ports'
import { sampleEntities } from '@/domain/schemas/fixtures'
import type { Bed } from '@/domain/schemas'
import {
  useBeds,
  useBedsByUnit,
  useDataInfo,
  useRecentEvents,
  useSubscribable,
  useTableCounts,
  useUnits,
} from './index'

function setup() {
  const backend = createMemoryBackend({ validateSchemas: true })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DataProvider backend={backend}>{children}</DataProvider>
  )
  return { backend, wrapper }
}

const bed = (id: string, unitId: string): Bed => ({ ...sampleEntities.bed, id, unitId })

async function putBeds(backend: DataBackend, beds: Bed[]) {
  await act(() =>
    backend.events.append(
      [],
      beds.map((record) => ({ entity: 'bed', op: 'put', record })),
    ),
  )
}

describe('data hooks', () => {
  it('useDataInfo returns the backend info', () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useDataInfo(), { wrapper })
    expect(result.current).toEqual({ name: 'memory', schemaVersion: 1 })
  })

  it('useTableCounts is undefined while loading, then updates after an append', async () => {
    const { backend, wrapper } = setup()
    const { result } = renderHook(() => useTableCounts(), { wrapper })
    expect(result.current).toBeUndefined()
    await waitFor(() => expect(result.current?.bed).toBe(0))

    await putBeds(backend, [bed('b1', 'u1')])
    await waitFor(() => expect(result.current?.bed).toBe(1))
  })

  it('useUnits and useBeds list current rows', async () => {
    const { backend, wrapper } = setup()
    const units = renderHook(() => useUnits(), { wrapper })
    const beds = renderHook(() => useBeds(), { wrapper })
    await act(() =>
      backend.events.append([], [{ entity: 'unit', op: 'put', record: sampleEntities.unit }]),
    )
    await putBeds(backend, [bed('b1', 'u1'), bed('b2', 'u2')])
    await waitFor(() => expect(units.result.current).toEqual([sampleEntities.unit]))
    await waitFor(() => expect(beds.result.current?.map((b) => b.id)).toEqual(['b1', 'b2']))
  })

  it('useBedsByUnit follows a changing unitId', async () => {
    const { backend, wrapper } = setup()
    await putBeds(backend, [bed('a1', 'unit-a'), bed('b1', 'unit-b'), bed('b2', 'unit-b')])
    const { result, rerender } = renderHook(({ unitId }) => useBedsByUnit(unitId), {
      wrapper,
      initialProps: { unitId: 'unit-a' },
    })
    await waitFor(() => expect(result.current?.map((b) => b.id)).toEqual(['a1']))
    rerender({ unitId: 'unit-b' })
    await waitFor(() => expect(result.current?.map((b) => b.id)).toEqual(['b1', 'b2']))
  })

  it('useRecentEvents returns newest first', async () => {
    const { backend, wrapper } = setup()
    const { result } = renderHook(() => useRecentEvents(5), { wrapper })
    await act(() =>
      backend.events.append(
        ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'].map(
          (id) => ({
            id,
            type: 'BedUnblocked' as const,
            occurredAt: '2026-10-20T08:00:00.000Z',
            actor: 'simulator',
            entityType: 'Bed' as const,
            entityId: 'b1',
            payload: {},
          }),
        ),
      ),
    )
    await waitFor(() =>
      expect(result.current?.map((event) => event.id)).toEqual([
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001',
      ]),
    )
  })

  it('unsubscribes from the source on unmount', async () => {
    const unsubscribe = vi.fn()
    const source: Subscribable<number> = {
      subscribe: (onValue) => {
        onValue(1)
        return unsubscribe
      },
    }
    const { result, unmount } = renderHook(() => useSubscribable(source))
    expect(result.current).toBe(1)
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('rethrows source errors during render', async () => {
    const source: Subscribable<number> = {
      subscribe: (_onValue, onError) => {
        queueMicrotask(() => onError?.(new Error('boom')))
        return () => {}
      },
    }
    const onError = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderHook(() => useSubscribable(source), {
      wrapper: ({ children }) => <ErrorCatcher onError={onError}>{children}</ErrorCatcher>,
    })
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' })),
    )
    vi.restoreAllMocks()
  })
})

class ErrorCatcher extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
