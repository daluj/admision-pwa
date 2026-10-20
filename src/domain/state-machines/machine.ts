import { InvalidTransitionError } from './errors'

/**
 * A transition target: a fixed state, or a guard that picks the target from the action context
 * and returns `{ rejected: reason }` when the context is not allowed.
 */
export type Transition<S extends string, C> =
  S | ((context: C | undefined) => S | { rejected: string })

export type TransitionTable<S extends string, A extends string, C> = Record<
  S,
  Partial<Record<A, Transition<S, C>>>
>

export type Machine<S extends string, A extends string, C> = {
  entity: string
  states: readonly S[]
  actions: readonly A[]
  /** Target state for `action` from `from`; throws InvalidTransitionError when not allowed. */
  next: (from: S, action: A, context?: C) => S
  /** Whether `action` is defined from `from` (guards are not evaluated). */
  can: (from: S, action: A) => boolean
  allowedActions: (from: S) => A[]
}

export function defineMachine<S extends string, A extends string, C = never>(config: {
  entity: string
  states: readonly S[]
  actions: readonly A[]
  transitions: TransitionTable<S, A, C>
}): Machine<S, A, C> {
  const { entity, states, actions, transitions } = config

  const next = (from: S, action: A, context?: C): S => {
    const transition: Transition<S, C> | undefined = transitions[from][action]
    if (transition === undefined) throw new InvalidTransitionError(entity, from, action)
    if (typeof transition === 'string') return transition
    const result = transition(context)
    if (typeof result === 'string') return result
    throw new InvalidTransitionError(entity, from, action, result.rejected)
  }

  const can = (from: S, action: A) => transitions[from][action] !== undefined
  const allowedActions = (from: S) => actions.filter((action) => can(from, action))

  return { entity, states, actions, next, can, allowedActions }
}
