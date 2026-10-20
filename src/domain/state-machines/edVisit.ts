import type { EdOutcome, EdVisitPhase } from '../schemas/edVisit'
import { ED_VISIT_PHASES } from '../schemas/edVisit'
import { defineMachine } from './machine'

export const ED_VISIT_ACTIONS = ['triage', 'startAssessment', 'decideAdmission', 'leave'] as const
export type EdVisitAction = (typeof ED_VISIT_ACTIONS)[number]

/** Context for `leave`: the outcome decides whether leaving is allowed from the current phase. */
export type EdVisitContext = { outcome: EdOutcome }

function leaveWith(allowed: readonly EdOutcome[]) {
  return (context: EdVisitContext | undefined) =>
    context && allowed.includes(context.outcome)
      ? ('LEFT_ED' as const)
      : { rejected: `outcome must be one of ${allowed.join(', ')}` }
}

export const edVisitMachine = defineMachine<EdVisitPhase, EdVisitAction, EdVisitContext>({
  entity: 'EdVisit',
  states: ED_VISIT_PHASES,
  actions: ED_VISIT_ACTIONS,
  transitions: {
    ARRIVED: { triage: 'TRIAGED', leave: leaveWith(['LWBS']) },
    TRIAGED: { startAssessment: 'IN_ASSESSMENT', leave: leaveWith(['LWBS']) },
    IN_ASSESSMENT: {
      decideAdmission: 'ADMIT_DECISION',
      leave: leaveWith(['DISCHARGED_HOME', 'TRANSFERRED_OUT', 'DECEASED']),
    },
    ADMIT_DECISION: { leave: leaveWith(['ADMITTED']) },
    LEFT_ED: {},
  },
})
