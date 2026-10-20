import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { FEMALE_NAMES, MALE_NAMES, personName, SURNAMES } from './names'
import { createRng } from './prng'

const draws = (seed: number, n = 20) => {
  const rng = createRng(seed)
  return Array.from({ length: n }, () => rng.float())
}

describe('createRng', () => {
  it('is deterministic per seed and differs between seeds', () => {
    expect(draws(42)).toEqual(draws(42))
    expect(draws(42)).not.toEqual(draws(7))
  })

  it('floats are in [0, 1)', () => {
    for (const value of draws(1, 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('int is inclusive on both bounds and rejects bad ranges', () => {
    const rng = createRng(3)
    const seen = new Set(Array.from({ length: 2_000 }, () => rng.int(1, 6)))
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6])
    expect(rng.int(5, 5)).toBe(5)
    expect(() => rng.int(3, 1)).toThrow(RangeError)
    expect(() => rng.int(0.5, 2)).toThrow(RangeError)
  })

  it('weighted roughly matches weights', () => {
    const rng = createRng(9)
    const counts = { a: 0, b: 0, c: 0 }
    for (let i = 0; i < 10_000; i++)
      counts[
        rng.weighted([
          ['a', 1],
          ['b', 3],
          ['c', 6],
        ] as const)
      ]++
    expect(counts.a / 10_000).toBeCloseTo(0.1, 1)
    expect(counts.b / 10_000).toBeCloseTo(0.3, 1)
    expect(counts.c / 10_000).toBeCloseTo(0.6, 1)
  })

  it('chance, pick and shuffle', () => {
    const rng = createRng(11)
    const hits = Array.from({ length: 10_000 }, () => rng.chance(0.25)).filter(Boolean).length
    expect(hits / 10_000).toBeCloseTo(0.25, 1)
    expect(['x', 'y']).toContain(rng.pick(['x', 'y']))
    expect(() => rng.pick([])).toThrow(RangeError)
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    const shuffled = rng.shuffle(items)
    expect([...shuffled].sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('uuid produces valid, deterministic, unique UUIDs', () => {
    const a = createRng(5)
    const ids = Array.from({ length: 1_000 }, () => a.uuid())
    for (const id of ids) expect(z.uuid().safeParse(id).success).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
    expect(createRng(5).uuid()).toBe(ids[0])
  })

  it('fork streams depend only on seed + label, not on prior draws', () => {
    const fresh = createRng(42).fork('beds')
    const used = createRng(42)
    used.float()
    used.float()
    const forked = used.fork('beds')
    expect(Array.from({ length: 5 }, () => forked.float())).toEqual(
      Array.from({ length: 5 }, () => fresh.float()),
    )
    expect(createRng(42).fork('beds').float()).not.toBe(createRng(42).fork('ed').float())
  })
})

describe('personName', () => {
  it('uses the right first-name list and two different surnames', () => {
    const rng = createRng(1)
    for (let i = 0; i < 200; i++) {
      const female = personName(rng, 'F')
      expect(FEMALE_NAMES).toContain(female.firstName)
      const [first, second] = female.lastName.split(' ')
      expect(SURNAMES).toContain(first)
      expect(SURNAMES).toContain(second)
      expect(first).not.toBe(second)
      expect(MALE_NAMES).toContain(personName(rng, 'M').firstName)
    }
  })

  it('is deterministic', () => {
    expect(personName(createRng(8), 'X')).toEqual(personName(createRng(8), 'X'))
  })
})
