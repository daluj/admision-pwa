import { describe, expect, it } from 'vitest'
import { admissionMachine } from './admission'
import { bedMachine } from './bed'
import { edVisitMachine } from './edVisit'
import { InvalidTransitionError } from './errors'
import type { Machine } from './machine'
import { transferRequestMachine } from './transferRequest'

type Edge = readonly [from: string, action: string, to: string]

/** Allowed transitions transcribed from the diagrams in specs/domain.md. */
const BED_EDGES: Edge[] = [
  ['AVAILABLE', 'reserve', 'RESERVED'],
  ['RESERVED', 'occupy', 'OCCUPIED'],
  ['OCCUPIED', 'discharge', 'PENDING_CLEANING'],
  ['PENDING_CLEANING', 'startCleaning', 'CLEANING'],
  ['CLEANING', 'finishCleaning', 'AVAILABLE'],
  ['RESERVED', 'release', 'AVAILABLE'],
  ['AVAILABLE', 'block', 'BLOCKED'],
  ['PENDING_CLEANING', 'block', 'BLOCKED'],
  ['CLEANING', 'block', 'BLOCKED'],
  ['BLOCKED', 'unblock', 'AVAILABLE'],
  ['OCCUPIED', 'transferOut', 'PENDING_CLEANING'],
]

const ADMISSION_EDGES: Edge[] = [
  ['SCHEDULED', 'requestBed', 'AWAITING_BED'],
  ['AWAITING_BED', 'assignBed', 'BED_ASSIGNED'],
  ['BED_ASSIGNED', 'releaseBed', 'AWAITING_BED'],
  ['BED_ASSIGNED', 'startTransfer', 'IN_TRANSFER'],
  ['IN_TRANSFER', 'admit', 'ADMITTED'],
  ['ADMITTED', 'orderDischarge', 'DISCHARGE_ORDERED'],
  ['DISCHARGE_ORDERED', 'discharge', 'DISCHARGED'],
  ['SCHEDULED', 'cancel', 'CANCELLED'],
  ['AWAITING_BED', 'cancel', 'CANCELLED'],
  ['BED_ASSIGNED', 'cancel', 'CANCELLED'],
]

const TRANSFER_EDGES: Edge[] = [
  ['REQUESTED', 'assign', 'ASSIGNED'],
  ['ASSIGNED', 'pickUp', 'PICKED_UP'],
  ['PICKED_UP', 'deliver', 'DELIVERED'],
  ['REQUESTED', 'cancel', 'CANCELLED'],
  ['ASSIGNED', 'cancel', 'CANCELLED'],
]

/** EdVisit edges without guards (leave is tested separately). */
const ED_VISIT_EDGES: Edge[] = [
  ['ARRIVED', 'triage', 'TRIAGED'],
  ['TRIAGED', 'startAssessment', 'IN_ASSESSMENT'],
  ['IN_ASSESSMENT', 'decideAdmission', 'ADMIT_DECISION'],
]

function describeMachine<S extends string, A extends string, C>(
  machine: Machine<S, A, C>,
  edges: Edge[],
  guarded: readonly A[] = [],
) {
  describe(`${machine.entity} state machine`, () => {
    it.each(edges)('%s --%s--> %s', (from, action, to) => {
      expect(machine.next(from as S, action as A)).toBe(to)
      expect(machine.can(from as S, action as A)).toBe(true)
    })

    it('rejects every transition not in the spec', () => {
      const allowed = new Set(edges.map(([from, action]) => `${from}:${action}`))
      let rejected = 0
      for (const from of machine.states) {
        for (const action of machine.actions) {
          if (allowed.has(`${from}:${action}`) || guarded.includes(action)) continue
          expect(() => machine.next(from, action)).toThrow(InvalidTransitionError)
          expect(machine.can(from, action)).toBe(false)
          rejected++
        }
      }
      expect(rejected).toBeGreaterThan(2)
    })

    it('lists allowed actions per state', () => {
      for (const from of machine.states) {
        const expected = machine.actions.filter(
          (action) =>
            edges.some(([f, a]) => f === from && a === action) ||
            (guarded.includes(action) && machine.can(from, action)),
        )
        expect(machine.allowedActions(from)).toEqual(expected)
      }
    })
  })
}

describeMachine(bedMachine, BED_EDGES)
describeMachine(admissionMachine, ADMISSION_EDGES)
describeMachine(transferRequestMachine, TRANSFER_EDGES)
describeMachine(edVisitMachine, ED_VISIT_EDGES, ['leave'])

describe('EdVisit leave guards', () => {
  const cases = [
    ['ARRIVED', 'LWBS', true],
    ['ARRIVED', 'DISCHARGED_HOME', false],
    ['TRIAGED', 'LWBS', true],
    ['TRIAGED', 'ADMITTED', false],
    ['IN_ASSESSMENT', 'DISCHARGED_HOME', true],
    ['IN_ASSESSMENT', 'TRANSFERRED_OUT', true],
    ['IN_ASSESSMENT', 'DECEASED', true],
    ['IN_ASSESSMENT', 'LWBS', false],
    ['IN_ASSESSMENT', 'ADMITTED', false],
    ['ADMIT_DECISION', 'ADMITTED', true],
    ['ADMIT_DECISION', 'DISCHARGED_HOME', false],
    ['LEFT_ED', 'ADMITTED', false],
  ] as const

  it.each(cases)('from %s with outcome %s → allowed: %s', (from, outcome, allowed) => {
    const leave = () => edVisitMachine.next(from, 'leave', { outcome })
    if (allowed) expect(leave()).toBe('LEFT_ED')
    else expect(leave).toThrow(InvalidTransitionError)
  })

  it('rejects leave without an outcome', () => {
    expect(() => edVisitMachine.next('ARRIVED', 'leave')).toThrow(InvalidTransitionError)
  })
})

describe('InvalidTransitionError', () => {
  it('carries entity, from and action', () => {
    try {
      bedMachine.next('OCCUPIED', 'reserve')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError)
      expect(error).toMatchObject({ entity: 'Bed', from: 'OCCUPIED', action: 'reserve' })
    }
  })
})
