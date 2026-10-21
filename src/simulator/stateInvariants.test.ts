import { describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { ensureDemoSeeded } from './seed/seedDemo'
import { readState, stateViolations } from './stateInvariants'

describe('stateViolations', () => {
  it.each([1, 42, 7])('finds nothing in the seeded hospital (seed %i)', async (seed) => {
    const backend = createMemoryBackend()
    await ensureDemoSeeded(backend, seed)
    expect(stateViolations(await readState(backend))).toEqual([])
  })

  it('detects a broken bed ↔ admission link and a stale porter', async () => {
    const backend = createMemoryBackend()
    await ensureDemoSeeded(backend, 42)
    const state = await readState(backend)
    const occupied = state.bed.find((b) => b.status === 'OCCUPIED')!
    occupied.admissionId = 'nope'
    state.porter[0]!.status = 'BUSY'
    const violations = stateViolations(state)
    expect(violations.some((m) => m.includes('occupied bed'))).toBe(true)
    expect(violations.some((m) => m.includes('busy without a job'))).toBe(true)
  })
})
