import { describe, expect, it } from 'vitest'
import type { EdKpis } from './ed'
import {
  boardingCountStatus,
  boardingLongStatus,
  physicianWaitStatus,
  triageWaitStatus,
  withinTargetStatus,
} from './edStatus'

const MIN = 60_000
const kpis = (extra: Partial<EdKpis>): EdKpis => ({
  present: 0,
  inWaitingRoom: 0,
  inBoxes: 0,
  waitingTriage: 0,
  oldestTriageWaitMs: null,
  waitingPhysician: 0,
  overTarget: 0,
  overTargetUrgent: 0,
  boarding: 0,
  boardingWithBed: 0,
  longestBoardingMs: null,
  boardingOverFourHours: 0,
  seen24h: 0,
  within24h: 0,
  withinPct: null,
  ...extra,
})

describe('ED tile statuses', () => {
  it.each([
    [null, 'neutral'],
    [0, 'ok'],
    [15 * MIN, 'ok'],
    [16 * MIN, 'warn'],
    [30 * MIN, 'warn'],
    [31 * MIN, 'critical'],
  ])('oldest triage wait %s → %s', (ms, status) => {
    expect(triageWaitStatus(ms)).toBe(status)
  })

  it('waiting for a physician: neutral, ok, warn (late non-urgent), critical (late L1/L2)', () => {
    expect(physicianWaitStatus(kpis({}))).toBe('neutral')
    expect(physicianWaitStatus(kpis({ waitingPhysician: 5 }))).toBe('ok')
    expect(physicianWaitStatus(kpis({ waitingPhysician: 5, overTarget: 1 }))).toBe('warn')
    expect(
      physicianWaitStatus(kpis({ waitingPhysician: 5, overTarget: 2, overTargetUrgent: 1 })),
    ).toBe('critical')
  })

  it.each([
    [0, 'neutral'],
    [10, 'neutral'],
    [11, 'warn'],
    [20, 'warn'],
    [21, 'critical'],
  ])('%i boarding patients → %s', (count, status) => {
    expect(boardingCountStatus(count)).toBe(status)
  })

  it.each([
    [null, 'neutral'],
    [239 * MIN, 'neutral'],
    [240 * MIN, 'neutral'], // exactly 4 h is not past it
    [241 * MIN, 'warn'],
    [480 * MIN, 'warn'],
    [481 * MIN, 'critical'],
  ])('longest boarding %s → %s', (ms, status) => {
    expect(boardingLongStatus(ms)).toBe(status)
  })

  it.each([
    [null, 'neutral'],
    [1, 'ok'],
    [0.85, 'ok'],
    [0.849, 'warn'],
    [0.7, 'warn'],
    [0.699, 'critical'],
    [0, 'critical'],
  ])('%s seen within target → %s', (pct, status) => {
    expect(withinTargetStatus(pct)).toBe(status)
  })
})
