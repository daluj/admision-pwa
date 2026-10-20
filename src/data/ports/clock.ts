import type { IsoDateTime } from '@/domain/schemas'

/** Source of "now". Domain and simulator code must never call Date.now() / new Date() directly. */
export type Clock = {
  now: () => IsoDateTime
}
