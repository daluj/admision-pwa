import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { EdException, EdKpis as Kpis } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { EdExceptions } from './EdExceptions'
import { EdKpis } from './EdKpis'

const copy = es.pages.emergency
const MIN = 60_000

const kpis = (extra: Partial<Kpis> = {}): Kpis => ({
  present: 40,
  inWaitingRoom: 12,
  inBoxes: 28,
  waitingTriage: 6,
  oldestTriageWaitMs: 12 * MIN,
  waitingPhysician: 10,
  overTarget: 2,
  overTargetUrgent: 0,
  boarding: 8,
  boardingWithBed: 2,
  longestBoardingMs: 5 * 60 * MIN + 10 * MIN,
  boardingOverFourHours: 3,
  seen24h: 100,
  within24h: 88,
  withinPct: 0.88,
  ...extra,
})

const tile = (label: string) =>
  within(screen.getByRole('list', { name: copy.kpis.label }))
    .getByText(label)
    .closest('li')!

const show = (k: Kpis) =>
  render(
    <MemoryRouter>
      <EdKpis kpis={k} />
    </MemoryRouter>,
  )

describe('EdKpis', () => {
  it('shows the six tiles with value and context', () => {
    show(kpis())
    expect(
      within(screen.getByRole('list', { name: copy.kpis.label })).getAllByRole('listitem'),
    ).toHaveLength(6)

    expect(tile(copy.kpis.present.label)).toHaveTextContent(
      `40${copy.kpis.present.context(28, 12)}`,
    )
    expect(tile(copy.kpis.waitingTriage.label)).toHaveTextContent(
      `6${copy.kpis.waitingTriage.context('12 min')}`,
    )
    expect(tile(copy.kpis.waitingPhysician.label)).toHaveTextContent(
      `10${copy.kpis.waitingPhysician.context(2)}`,
    )
    expect(tile(copy.kpis.boarding.label)).toHaveTextContent(`8${copy.kpis.boarding.context(2)}`)
    expect(tile(copy.kpis.longestBoarding.label)).toHaveTextContent(
      `5 h 10 min${copy.kpis.longestBoarding.context(3)}`,
    )
    expect(tile(copy.kpis.withinTarget.label)).toHaveTextContent('88%')
    expect(tile(copy.kpis.withinTarget.label)).toHaveTextContent(
      copy.kpis.withinTarget.context(88, 100),
    )
    expect(tile(copy.kpis.withinTarget.label)).toHaveTextContent(copy.kpis.withinTarget.target(85))
  })

  it('colours each tile by its thresholds', () => {
    show(kpis({ oldestTriageWaitMs: 31 * MIN, overTarget: 2, overTargetUrgent: 1, boarding: 21 }))
    expect(tile(copy.kpis.waitingTriage.label)).toHaveAttribute('data-status', 'critical')
    expect(tile(copy.kpis.waitingPhysician.label)).toHaveAttribute('data-status', 'critical')
    expect(tile(copy.kpis.boarding.label)).toHaveAttribute('data-status', 'critical')
    expect(tile(copy.kpis.longestBoarding.label)).toHaveAttribute('data-status', 'warn') // 5 h 10
    expect(tile(copy.kpis.withinTarget.label)).toHaveAttribute('data-status', 'ok')
    expect(tile(copy.kpis.present.label)).toHaveAttribute('data-status', 'neutral')
  })

  it('amber for a late non-urgent patient, and for 70–85 % within target', () => {
    show(
      kpis({ overTarget: 1, overTargetUrgent: 0, withinPct: 0.75, oldestTriageWaitMs: 20 * MIN }),
    )
    expect(tile(copy.kpis.waitingPhysician.label)).toHaveAttribute('data-status', 'warn')
    expect(tile(copy.kpis.waitingTriage.label)).toHaveAttribute('data-status', 'warn')
    expect(tile(copy.kpis.withinTarget.label)).toHaveAttribute('data-status', 'warn')
  })

  it('shows dashes and neutral tiles when there is nothing to measure', () => {
    show(
      kpis({
        present: 0,
        inWaitingRoom: 0,
        inBoxes: 0,
        waitingTriage: 0,
        oldestTriageWaitMs: null,
        waitingPhysician: 0,
        overTarget: 0,
        boarding: 0,
        boardingWithBed: 0,
        longestBoardingMs: null,
        boardingOverFourHours: 0,
        seen24h: 0,
        within24h: 0,
        withinPct: null,
      }),
    )
    expect(tile(copy.kpis.longestBoarding.label)).toHaveTextContent('—')
    expect(tile(copy.kpis.withinTarget.label)).toHaveTextContent('—')
    expect(tile(copy.kpis.withinTarget.label)).toHaveTextContent(copy.kpis.withinTarget.none)
    expect(tile(copy.kpis.waitingTriage.label)).toHaveTextContent(
      copy.kpis.waitingTriage.context(null),
    )
    for (const label of [
      copy.kpis.waitingTriage.label,
      copy.kpis.waitingPhysician.label,
      copy.kpis.boarding.label,
      copy.kpis.longestBoarding.label,
      copy.kpis.withinTarget.label,
    ]) {
      expect(tile(label)).toHaveAttribute('data-status', 'neutral')
    }
  })
})

describe('EdExceptions', () => {
  const exceptions: EdException[] = [
    {
      id: 'boarding:v9',
      kind: 'boardingLong',
      severity: 'critical',
      initials: 'A. B. F.',
      ageMs: 9 * 60 * MIN,
    },
    {
      id: 'triage:v3',
      kind: 'triageBreach',
      severity: 'critical',
      initials: 'M. G. R.',
      level: 2,
      waitMs: 25 * MIN,
      targetMin: 10,
      ageMs: 25 * MIN,
    },
    {
      id: 'triage:v6',
      kind: 'triageBreach',
      severity: 'critical',
      initials: 'P. V. D.',
      level: 1,
      waitMs: 2 * MIN,
      targetMin: 0,
      ageMs: 2 * MIN,
    },
    {
      id: 'triage:v5',
      kind: 'triageBreach',
      severity: 'warn',
      initials: 'L. P. G.',
      level: 4,
      waitMs: 130 * MIN,
      targetMin: 120,
      ageMs: 130 * MIN,
    },
  ]

  it('describes each exception in Spanish with initials, wait and target', () => {
    render(
      <MemoryRouter>
        <EdExceptions exceptions={exceptions} />
      </MemoryRouter>,
    )
    expect(screen.getByText(copy.exceptions.boardingLong('A. B. F.', '9 h'))).toBeInTheDocument()
    expect(
      screen.getByText(copy.exceptions.triageBreach('M. G. R.', 2, '25 min')),
    ).toBeInTheDocument()
    expect(screen.getByText(copy.exceptions.triageDetail(10))).toBeInTheDocument()
    expect(screen.getByText(copy.exceptions.triageDetail(0))).toBeInTheDocument()
    expect(
      screen.getByText(copy.exceptions.triageBreach('L. P. G.', 4, '2 h 10 min')),
    ).toBeInTheDocument()
  })

  it('sorts by severity, then oldest first', () => {
    render(
      <MemoryRouter>
        <EdExceptions exceptions={[...exceptions].reverse()} />
      </MemoryRouter>,
    )
    const rows = screen.getAllByRole('listitem')
    expect(rows.map((r) => r.getAttribute('data-severity'))).toEqual([
      'critical',
      'critical',
      'critical',
      'warn',
    ])
    expect(rows[0]).toHaveTextContent('A. B. F.') // 9 h
    expect(rows[1]).toHaveTextContent('M. G. R.') // 25 min
    expect(rows[3]).toHaveTextContent('L. P. G.')
  })

  it('shows the empty message when nobody needs attention', () => {
    render(
      <MemoryRouter>
        <EdExceptions exceptions={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText(es.dashboard.exceptions.empty)).toBeInTheDocument()
  })
})
