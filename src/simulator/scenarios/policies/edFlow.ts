import {
  decideAdmission,
  registerEdDeparture,
  startEdAssessment,
  triageEdPatient,
} from '@/domain/commands'
import type { EdVisit, TriageLevel } from '@/domain/schemas'
import { COMPLAINTS } from '@/simulator/seed/generateEd'
import {
  ADMIT_DECISION_DELAY,
  ADMIT_SHARE,
  FALLBACK_SPECIALTY,
  HOME_DEPARTURE_DELAY,
  ICU_SHARE_URGENT,
  ISOLATION_SHARE,
  LWBS_SHARE,
  MAX_ASSESSMENTS_PER_MINUTE,
  PHYSICIAN_TARGET_MINUTES,
  TRIAGE_DELAY,
  TRIAGE_SHARES,
  WITHIN_TARGET_SHARE,
} from '../normalDay.config'
import { entityChance, entityInt, entityRng, minutesBetween } from '../entityRandom'
import type { MinuteContext } from '../types'
import type { World } from '../world'

const specialtyByComplaint = new Map(COMPLAINTS)

/** Manchester level of a visit about to be triaged: fixed per visit, drawn from the shares. */
function triageLevelFor(seed: number, visit: EdVisit): TriageLevel {
  return visit.triageLevel ?? entityRng(seed, 'triage-level', visit.id).weighted(TRIAGE_SHARES)
}

/** Minutes a triaged patient waits for a physician: ≈ 85 % within target, the rest up to 1.5×. */
function physicianWait(seed: number, visit: EdVisit, level: TriageLevel): number {
  const target = PHYSICIAN_TARGET_MINUTES[level]
  const rng = entityRng(seed, 'physician-wait', visit.id)
  if (level === 1) return rng.int(0, 2)
  if (level === 2) return rng.int(2, target)
  return rng.chance(WITHIN_TARGET_SHARE)
    ? rng.int(Math.max(1, Math.round(target * 0.25)), target)
    : rng.int(target + 1, Math.round(target * 1.5))
}

/** ED patients move through triage, assessment and either an admission decision or discharge. */
export async function edFlow(ctx: MinuteContext, world: World): Promise<void> {
  const { seed, at } = ctx
  let assessments = 0

  for (const visit of world.edVisits) {
    const level = triageLevelFor(seed, visit)

    switch (visit.phase) {
      case 'ARRIVED': {
        const wait = entityInt(seed, 'triage-delay', visit.id, TRIAGE_DELAY[level])
        if (minutesBetween(visit.arrivedAt, at) >= wait) {
          await ctx.exec(triageEdPatient, { edVisitId: visit.id, triageLevel: level })
        }
        break
      }
      case 'TRIAGED': {
        const triagedAt = visit.triagedAt ?? visit.arrivedAt
        const wait = physicianWait(seed, visit, level)
        const waited = minutesBetween(triagedAt, at)
        const leaves = level >= 4 && wait > 30 && entityChance(seed, 'lwbs', visit.id, LWBS_SHARE)
        if (leaves && waited >= Math.round(wait * 0.7)) {
          await ctx.exec(registerEdDeparture, { edVisitId: visit.id, outcome: 'LWBS' })
        } else if (waited >= wait && assessments < MAX_ASSESSMENTS_PER_MINUTE) {
          assessments++
          await ctx.exec(startEdAssessment, { edVisitId: visit.id })
        }
        break
      }
      case 'IN_ASSESSMENT': {
        const seenAt = visit.seenAt ?? visit.arrivedAt
        const treated = minutesBetween(seenAt, at)
        const admit = entityChance(seed, 'admit', visit.id, ADMIT_SHARE)
        if (admit) {
          if (treated >= entityInt(seed, 'admit-delay', visit.id, ADMIT_DECISION_DELAY)) {
            const icu = level <= 2 && entityChance(seed, 'icu', visit.id, ICU_SHARE_URGENT)
            await ctx.exec(decideAdmission, {
              edVisitId: visit.id,
              targetSpecialtyCode:
                specialtyByComplaint.get(visit.chiefComplaint) ?? FALLBACK_SPECIALTY,
              requiredUnitType: icu ? 'ICU' : 'WARD',
              isolationRequired: entityChance(seed, 'isolation', visit.id, ISOLATION_SHARE),
            })
          }
        } else if (treated >= entityInt(seed, 'home-delay', visit.id, HOME_DEPARTURE_DELAY)) {
          await ctx.exec(registerEdDeparture, { edVisitId: visit.id, outcome: 'DISCHARGED_HOME' })
        }
        break
      }
      default:
        break
    }
  }
}
