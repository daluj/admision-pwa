import { act, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { computeEd } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { ED_NOW, edInput } from '@/test/edFixture'
import { EdBoard } from './EdBoard'

const copy = es.pages.emergency.board

const renderBoard = (columns = computeEd(edInput).columns) =>
  render(
    <TooltipProvider>
      <EdBoard columns={columns} now={ED_NOW} />
    </TooltipProvider>,
  )

const column = (phase: string) => document.querySelector(`[data-phase="${phase}"]`) as HTMLElement
const cardsIn = (phase: string) => within(column(phase)).queryAllByRole('listitem')

describe('EdBoard', () => {
  it('has the four phase columns with their counts', () => {
    renderBoard()
    for (const [phase, count] of [
      ['ARRIVED', 2],
      ['TRIAGED', 4],
      ['IN_ASSESSMENT', 1],
      ['ADMIT_DECISION', 3],
    ] as const) {
      const heading = within(column(phase)).getByRole('heading', { level: 3 })
      expect(heading).toHaveTextContent(copy.columns[phase])
      expect(heading).toHaveTextContent(String(count))
      expect(cardsIn(phase)).toHaveLength(count)
    }
    // Patients who left are not on the board.
    expect(document.querySelectorAll('[data-visit]')).toHaveLength(10)
  })

  it('orders cards by triage level (L1 first), then by longest wait; Llegada has no level, longest wait first', () => {
    renderBoard()
    const order = (phase: string) =>
      cardsIn(phase).map((li) => li.querySelector('[data-visit]')!.getAttribute('data-visit'))
    expect(order('TRIAGED')).toEqual(['v6', 'v3', 'v4', 'v5'])
    expect(order('ARRIVED')).toEqual(['v2', 'v1'])
    expect(order('ADMIT_DECISION')).toEqual(['v9', 'v8', 'v10'])
  })

  it('every triaged card carries its Manchester badge: colour and number', () => {
    renderBoard()
    const triaged = cardsIn('TRIAGED')
    const levels = triaged.map((li) => li.querySelector('[data-level]')!.getAttribute('data-level'))
    expect(levels).toEqual(['1', '2', '3', '4'])
    expect(triaged[0]!.querySelector('[data-level="1"]')).toHaveClass('bg-triage-1')
    expect(triaged[1]!.querySelector('[data-level="2"]')).toHaveClass('bg-triage-2')
    // Patients not triaged yet say so instead of showing a colour.
    expect(within(cardsIn('ARRIVED')[0]!).getByText(copy.noTriage)).toBeInTheDocument()
  })

  it('shows the wait against the Manchester target and colours late patients', () => {
    renderBoard()
    const [l1, l2, l3, l4] = cardsIn('TRIAGED')
    const waitLevel = (li: HTMLElement) =>
      [...li.querySelectorAll('[data-level]')]
        .find((el) => !el.className.includes('triage'))!
        .getAttribute('data-level')
    expect(waitLevel(l1!)).toBe('critical') // L1: any wait
    expect(waitLevel(l2!)).toBe('critical') // 25 min vs 10: > 1.5×
    expect(waitLevel(l3!)).toBe('ok') // 30 min vs 60
    expect(waitLevel(l4!)).toBe('warn') // 130 min vs 120
    expect(l2).toHaveTextContent(copy.target(10))
    expect(l1).toHaveTextContent(copy.target(0))
    expect(l3).toHaveTextContent('30 min')
    expect(document.querySelector('[data-visit="v3"]')).toHaveAttribute('data-over-target', 'true')
    expect(document.querySelector('[data-visit="v4"]')).not.toHaveAttribute('data-over-target')
  })

  it('colours waiting for triage (15/30 min) and boarding (4/8 h)', () => {
    renderBoard()
    const waitLevel = (visit: string) =>
      [...document.querySelector(`[data-visit="${visit}"]`)!.querySelectorAll('[data-level]')]
        .find((el) => !el.className.includes('triage'))!
        .getAttribute('data-level')
    expect(waitLevel('v1')).toBe('ok') // 12 min
    expect(waitLevel('v2')).toBe('critical') // 40 min
    expect(waitLevel('v8')).toBe('warn') // 5 h
    expect(waitLevel('v9')).toBe('critical') // 9 h
    expect(waitLevel('v10')).toBe('ok') // 1 h
  })

  it('shows initials, complaint and area on the card face, never the name or NHC', () => {
    renderBoard()
    const card = document.querySelector('[data-visit="v2"]') as HTMLElement
    expect(card).toHaveTextContent(/[A-ZÁÉÍÓÚ]\. G\. R\./)
    expect(card).toHaveTextContent('Fiebre sin foco')
    expect(card).toHaveTextContent(copy.areas.BOXES)
    expect(card).not.toHaveTextContent('García')
    expect(card).not.toHaveTextContent('SIM-')
    expect(document.querySelector('[data-visit="v6"]')).toHaveTextContent(copy.areas.RESUS)
    expect(document.querySelector('[data-visit="v1"]')).toHaveTextContent(copy.areas.WAITING_ROOM)
  })

  it('reveals the full identity only in the tooltip, opened with the keyboard', async () => {
    renderBoard()
    expect(screen.queryByText('SIM-V2')).not.toBeInTheDocument()
    act(() => (document.querySelector('[data-visit="v2"]') as HTMLElement).focus())
    expect((await screen.findAllByText('SIM-V2')).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/García Ruiz/).length).toBeGreaterThan(0)
  })

  it('shows an empty state in a column without patients', () => {
    const columns = computeEd({
      ...edInput,
      edVisits: edInput.edVisits.filter((v) => v.phase !== 'IN_ASSESSMENT'),
    }).columns
    renderBoard(columns)
    expect(within(column('IN_ASSESSMENT')).getByText(copy.empty)).toBeInTheDocument()
    expect(cardsIn('IN_ASSESSMENT')).toHaveLength(0)
  })
})
