import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBedIdSet } from './useBedIdSet'

describe('useBedIdSet', () => {
  it('keeps the same Set while the ids are the same, even in a new array', () => {
    const { result, rerender } = renderHook(({ ids }) => useBedIdSet(ids), {
      initialProps: { ids: ['a', 'b'] },
    })
    const first = result.current
    rerender({ ids: ['a', 'b'] })
    expect(result.current).toBe(first)
    expect([...first]).toEqual(['a', 'b'])
  })

  it('makes a new Set when the ids change, and handles none', () => {
    const { result, rerender } = renderHook(({ ids }) => useBedIdSet(ids), {
      initialProps: { ids: ['a'] },
    })
    const first = result.current
    rerender({ ids: ['a', 'c'] })
    expect(result.current).not.toBe(first)
    expect(result.current.has('c')).toBe(true)
    rerender({ ids: [] })
    expect(result.current.size).toBe(0)
  })
})
