import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import type { DataBackend, Subscribable } from '@/data/ports'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { sharedSource, useRecentEvents, useSubscribable, useUnits } from './index'

/** Counts how many upstream subscriptions (= live queries) the app opens on a table. */
function counting(backend: DataBackend) {
  const stats = { opened: 0, closed: 0 }
  const original = backend.repositories.unit.observeList
  backend.repositories.unit.observeList = () => {
    const source: Subscribable<unknown[]> = original() as Subscribable<unknown[]>
    return {
      subscribe: (onValue: (v: unknown[]) => void, onError?: (e: unknown) => void) => {
        stats.opened++
        const off = source.subscribe(onValue, onError)
        return () => {
          stats.closed++
          off()
        }
      },
    } as never
  }
  return stats
}

const wrapperFor = (backend: DataBackend) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <DataProvider backend={backend}>{children}</DataProvider>
  }

function Units({ id }: { id: string }) {
  const units = useUnits()
  return <p data-testid={id}>{units === undefined ? '…' : units.length}</p>
}

describe('shared live queries', () => {
  it('many components on one table open a single upstream query', async () => {
    const backend = createMemoryBackend()
    const stats = counting(backend)
    render(
      <DataProvider backend={backend}>
        <Units id="a" />
        <Units id="b" />
        <Units id="c" />
      </DataProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('c')).toHaveTextContent('0'))
    expect(stats.opened).toBe(1)
  })

  it('every component sees the changes, and late subscribers get the current value', async () => {
    const backend = createMemoryBackend()
    const { result: first } = renderHook(() => useUnits(), { wrapper: wrapperFor(backend) })
    await waitFor(() => expect(first.current).toEqual([]))
    await act(async () => {
      await backend.events.append([], [{ entity: 'unit', op: 'put', record: sampleEntities.unit }])
    })
    await waitFor(() => expect(first.current).toHaveLength(1))
    const { result: late } = renderHook(() => useUnits(), { wrapper: wrapperFor(backend) })
    await waitFor(() => expect(late.current).toHaveLength(1))
  })

  it('releases the query when the last component goes away and reopens it later', async () => {
    const backend = createMemoryBackend()
    const stats = counting(backend)
    const a = renderHook(() => useUnits(), { wrapper: wrapperFor(backend) })
    const b = renderHook(() => useUnits(), { wrapper: wrapperFor(backend) })
    await waitFor(() => expect(a.result.current).toEqual([]))
    a.unmount()
    expect(stats.closed).toBe(0) // b still listens
    b.unmount()
    expect(stats.closed).toBe(1)
    renderHook(() => useUnits(), { wrapper: wrapperFor(backend) })
    expect(stats.opened).toBe(2)
  })

  it('event windows are shared per limit, and different limits are different queries', () => {
    const backend = createMemoryBackend()
    const spy = vi.spyOn(backend.events, 'observeRecent')
    const wrapper = wrapperFor(backend)
    renderHook(() => useRecentEvents(100), { wrapper })
    renderHook(() => useRecentEvents(100), { wrapper })
    renderHook(() => useRecentEvents(5000), { wrapper })
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('sharedSource returns the same instance per owner and key', () => {
    const owner = {}
    const make = vi.fn(() => ({ subscribe: () => () => {} }))
    expect(sharedSource(owner, 'k', make)).toBe(sharedSource(owner, 'k', make))
    expect(make).toHaveBeenCalledTimes(1)
    expect(sharedSource(owner, 'other', make)).not.toBe(sharedSource(owner, 'k', make))
    expect(sharedSource({}, 'k', make)).not.toBe(sharedSource(owner, 'k', make))
  })

  it('after going idle a remount starts from loading, not from the old value', async () => {
    const backend = createMemoryBackend()
    const first = renderHook(() => useUnits(), { wrapper: wrapperFor(backend) })
    await waitFor(() => expect(first.result.current).toEqual([]))
    first.unmount()
    await backend.events.append([], [{ entity: 'unit', op: 'put', record: sampleEntities.unit }])
    const again = renderHook(() => useUnits(), { wrapper: wrapperFor(backend) })
    // Never the stale empty list: either still loading or already the fresh one.
    expect(again.result.current === undefined || again.result.current.length === 1).toBe(true)
    await waitFor(() => expect(again.result.current).toHaveLength(1))
  })

  it('a failed query recovers on a later subscription instead of rethrowing the cached error', async () => {
    let fail = true
    // One source instance (as cached by `sharedSource`) that fails first and works afterwards.
    const source: Subscribable<number> = {
      subscribe: (onValue, onError) => {
        if (fail) queueMicrotask(() => onError?.(new Error('db down')))
        else queueMicrotask(() => onValue(7))
        return () => {}
      },
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Probe() {
      const value = useSubscribable(source)
      return <p data-testid="probe">{value === undefined ? '…' : value}</p>
    }
    const first = render(
      <ErrorBoundary>
        <Probe />
      </ErrorBoundary>,
    )
    expect(await screen.findByRole('alert')).toBeInTheDocument() // the failure reached the boundary
    first.unmount()
    fail = false
    render(
      <ErrorBoundary>
        <Probe />
      </ErrorBoundary>,
    )
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('7'))
    spy.mockRestore()
  })
})
