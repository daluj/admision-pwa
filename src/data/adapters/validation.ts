import { entitySchemas, isEntityName, NewHospitalEvent, type EntityName } from '@/domain/schemas'
import { AppendError, type Change } from '@/data/ports'

/** Shared append validation for every adapter. Throws AppendError; nothing has been written yet. */
export function validateAppend(
  events: readonly NewHospitalEvent[],
  changes: readonly Change[],
  options: { validateSchemas: boolean },
): void {
  const ids = new Set<string>()
  for (const event of events) {
    if (ids.has(event.id)) throw new AppendError(`Duplicate event id in batch: ${event.id}`)
    ids.add(event.id)
  }
  for (const change of changes) {
    const entity: string = change.entity
    if (!isEntityName(entity)) throw new AppendError(`Unknown entity: ${entity}`)
  }
  if (!options.validateSchemas) return

  for (const event of events) {
    const result = NewHospitalEvent.safeParse(event)
    if (!result.success) {
      throw new AppendError(`Invalid event ${event.type}: ${result.error.message}`, {
        cause: result.error,
      })
    }
  }
  for (const change of changes) {
    if (change.op !== 'put') continue
    const result = entitySchemas[change.entity as EntityName].safeParse(change.record)
    if (!result.success) {
      throw new AppendError(`Invalid ${change.entity} record: ${result.error.message}`, {
        cause: result.error,
      })
    }
  }
}

/** Validate in development and tests; skip in production builds for speed. */
export const VALIDATE_SCHEMAS_DEFAULT = import.meta.env.DEV
