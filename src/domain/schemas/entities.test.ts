import { describe, expect, it } from 'vitest'
import { sampleEntities } from './fixtures'
import { ENTITY_NAMES, entitySchemas, type EntityName } from './index'

/** One invalid mutation per entity (a wrong enum, missing field or bad value). */
const invalidMutations: { [N in EntityName]: Record<string, unknown> } = {
  specialty: { code: 'cardio lower' },
  unit: { type: 'GARAGE' },
  bed: { status: 'DIRTY' },
  patient: { sex: 'Q' },
  edVisit: { triageLevel: 6 },
  admission: { type: 'ELECTIVE' },
  bedRequest: { priority: 'P9' },
  transferRequest: { fromLocation: { kind: 'MOON', label: 'x' } },
  porter: { shift: 'WEEKEND' },
  user: { role: 'ROOT' },
  alert: { severity: 'PANIC' },
  simulationState: { speed: 7 },
}

describe('entity schemas', () => {
  it('cover every entity', () => {
    expect(ENTITY_NAMES).toHaveLength(12)
  })

  it.each(ENTITY_NAMES)('%s accepts a valid sample', (name) => {
    expect(entitySchemas[name].safeParse(sampleEntities[name]).success).toBe(true)
  })

  it.each(ENTITY_NAMES)('%s rejects an invalid sample', (name) => {
    const invalid = { ...sampleEntities[name], ...invalidMutations[name] }
    expect(entitySchemas[name].safeParse(invalid).success).toBe(false)
  })

  it.each(ENTITY_NAMES)('%s rejects a missing id', (name) => {
    const { id: _id, ...withoutId } = sampleEntities[name]
    expect(entitySchemas[name].safeParse(withoutId).success).toBe(false)
  })

  it.each(['2026-10-20T10:00:00+02:00', '2026-10-20 08:00', '20/10/2026', ''])(
    'rejects non-UTC timestamp %j',
    (createdAt) => {
      expect(entitySchemas.bed.safeParse({ ...sampleEntities.bed, createdAt }).success).toBe(false)
    },
  )

  it('accepts UTC timestamps with and without milliseconds', () => {
    for (const createdAt of ['2026-10-20T08:00:00Z', '2026-10-20T08:00:00.123Z']) {
      expect(entitySchemas.bed.safeParse({ ...sampleEntities.bed, createdAt }).success).toBe(true)
    }
  })
})
