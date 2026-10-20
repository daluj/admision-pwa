import type { EntityName } from '@/domain/schemas'

/**
 * Fields that must be unique per entity table. Part of the contract: every adapter rejects an
 * append that would create a duplicate (Dexie via `&` indexes, Postgres via UNIQUE).
 */
export const UNIQUE_FIELDS = {
  specialty: ['code'],
  unit: ['code'],
  patient: ['mrn'],
  user: ['username'],
} as const satisfies Partial<Record<EntityName, readonly string[]>>
