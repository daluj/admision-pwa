import { z } from 'zod'
import { Code, EntityBase, Id, IsoDateTime, TriageLevel } from './common'

export const ED_VISIT_PHASES = [
  'ARRIVED',
  'TRIAGED',
  'IN_ASSESSMENT',
  'ADMIT_DECISION',
  'LEFT_ED',
] as const
export const EdVisitPhase = z.enum(ED_VISIT_PHASES)
export type EdVisitPhase = z.infer<typeof EdVisitPhase>

export const ED_AREAS = ['BOXES', 'OBSERVATION', 'RESUS', 'WAITING_ROOM'] as const
export const EdArea = z.enum(ED_AREAS)
export type EdArea = z.infer<typeof EdArea>

export const ED_OUTCOMES = [
  'ADMITTED',
  'DISCHARGED_HOME',
  'LWBS',
  'TRANSFERRED_OUT',
  'DECEASED',
] as const
export const EdOutcome = z.enum(ED_OUTCOMES)
export type EdOutcome = z.infer<typeof EdOutcome>

export const EdVisit = EntityBase.extend({
  patientId: Id,
  arrivedAt: IsoDateTime,
  phase: EdVisitPhase,
  triageLevel: TriageLevel.optional(),
  triagedAt: IsoDateTime.optional(),
  seenAt: IsoDateTime.optional(),
  admitDecisionAt: IsoDateTime.optional(),
  area: EdArea,
  chiefComplaint: z.string().min(1),
  targetSpecialtyCode: Code.optional(),
  endedAt: IsoDateTime.optional(),
  outcome: EdOutcome.optional(),
})
export type EdVisit = z.infer<typeof EdVisit>
