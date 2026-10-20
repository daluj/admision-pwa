/** Raised when an action is not allowed from the current state (see specs/domain.md → State Machines). */
export class InvalidTransitionError extends Error {
  readonly entity: string
  readonly from: string
  readonly action: string

  constructor(entity: string, from: string, action: string, detail?: string) {
    super(
      `Invalid ${entity} transition: cannot ${action} from ${from}${detail ? ` (${detail})` : ''}`,
    )
    this.name = 'InvalidTransitionError'
    this.entity = entity
    this.from = from
    this.action = action
  }
}
