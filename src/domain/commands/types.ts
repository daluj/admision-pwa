import type { Change } from '@/data/ports'
import type { NewHospitalEvent } from '@/domain/schemas'

/** What every domain command returns: events + the state changes they cause, to append together. */
export type CommandResult = {
  events: NewHospitalEvent[]
  changes: Change[]
}

/** Thrown when command input is invalid. Nothing should be written. */
export class InvalidCommandError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'InvalidCommandError'
  }
}
