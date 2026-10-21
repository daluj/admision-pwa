import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BedSuggestion, OpenRequestRow } from '@/domain/kpis'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { es } from '@/i18n/es'
import type { BedActionResult } from '../useBedActions'
import { AssignBedSheet } from './AssignBedSheet'

type Reserve = (candidate: BedSuggestion) => Promise<BedActionResult>

const copy = es.pages.beds.assignSheet

const row: OpenRequestRow = {
  request: { ...sampleEntities.bedRequest, id: 'r1', priority: 'P1' },
  admission: sampleEntities.admission,
  initials: 'M. G. R.',
  source: { kind: 'ED', triageLevel: 2 },
  specialtyName: 'Cardiología',
  waitMs: 3_600_000,
}
const suggestion = (label: string, tags: BedSuggestion['tags']): BedSuggestion => ({
  bed: { ...sampleEntities.bed, id: `bed-${label}`, label },
  unit: {
    ...sampleEntities.unit,
    name: 'Cardiología 5ª Norte',
    building: 'Edificio Norte',
    floor: 5,
  },
  tags,
})
const ranked = [
  suggestion('A1', ['SPECIALTY']),
  suggestion('A2', ['SPECIALTY']),
  suggestion('A3', ['SPECIALTY', 'ISOLATION']),
  suggestion('A4', ['SPECIALTY']),
  suggestion('A5', ['SPECIALTY']),
  suggestion('M1', ['OUTLIER']),
  suggestion('M2', ['OUTLIER']),
]
const suggestions = { suggestions: ranked.slice(0, 5), candidates: ranked }

function open(onReserve: Reserve = vi.fn<Reserve>(async () => ({ ok: true })), extra = {}) {
  const onClose = vi.fn()
  render(
    <AssignBedSheet
      row={row}
      suggestions={suggestions}
      onReserve={onReserve}
      onClose={onClose}
      {...extra}
    />,
  )
  return { onReserve, onClose }
}

describe('AssignBedSheet', () => {
  it('shows the request and the top suggestions with their tags, in rank order', () => {
    open()
    const dialog = screen.getByRole('dialog', { name: copy.title })
    expect(within(dialog).getByText(/M\. G\. R\. · Cardiología · Planta/)).toBeInTheDocument()
    const radios = within(dialog).getAllByRole('radio')
    expect(radios.map((r) => r.closest('div')?.textContent?.slice(0, 2))).toEqual([
      'A1',
      'A2',
      'A3',
      'A4',
      'A5',
    ])
    expect(within(dialog).getByText(copy.tags.ISOLATION)).toBeInTheDocument()
    expect(within(dialog).queryByText(copy.tags.OUTLIER)).not.toBeInTheDocument()
  })

  it('"Ver todas" reveals the remaining compatible beds, including outliers', async () => {
    const user = userEvent.setup()
    open()
    await user.click(screen.getByRole('button', { name: copy.showAll(7) }))
    expect(screen.getAllByRole('radio')).toHaveLength(7)
    expect(screen.getAllByText(copy.tags.OUTLIER)).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: copy.showLess }))
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('reserves only after a bed is chosen, then closes', async () => {
    const user = userEvent.setup()
    const { onReserve, onClose } = open()
    const reserve = screen.getByRole('button', { name: copy.reserve })
    expect(reserve).toBeDisabled()
    expect(screen.getByText(copy.selectHint)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /A2/ }))
    expect(reserve).toBeEnabled()
    await user.click(reserve)
    expect(onReserve).toHaveBeenCalledWith(ranked[1])
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('keeps the sheet open and shows the reason when the reservation fails', async () => {
    const user = userEvent.setup()
    const message = es.pages.beds.actions.errors.stale
    const { onClose } = open(vi.fn<Reserve>(async () => ({ ok: false, reason: 'stale', message })))
    await user.click(screen.getByRole('radio', { name: /A1/ }))
    await user.click(screen.getByRole('button', { name: copy.reserve }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(onClose).not.toHaveBeenCalled()
    // Choosing another bed clears the message.
    await user.click(screen.getByRole('radio', { name: /A2/ }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('drops the choice when its bed disappears from the live candidates', async () => {
    const user = userEvent.setup()
    const onReserve = vi.fn<Reserve>(async () => ({ ok: true }))
    const { rerender } = render(
      <AssignBedSheet
        row={row}
        suggestions={suggestions}
        onReserve={onReserve}
        onClose={() => {}}
      />,
    )
    await user.click(screen.getByRole('radio', { name: /A1/ }))
    expect(screen.getByRole('button', { name: copy.reserve })).toBeEnabled()

    const without = ranked.filter((c) => c.bed.label !== 'A1')
    rerender(
      <AssignBedSheet
        row={row}
        suggestions={{ suggestions: without.slice(0, 5), candidates: without }}
        onReserve={onReserve}
        onClose={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: copy.reserve })).toBeDisabled()
  })

  it('says so when no bed is compatible, and disables the button while busy', () => {
    open(undefined, { suggestions: { suggestions: [], candidates: [] } })
    expect(screen.getByText(copy.none)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.reserve })).toBeDisabled()
  })

  it('renders nothing when there is no request', () => {
    render(
      <AssignBedSheet
        row={null}
        suggestions={suggestions}
        onReserve={vi.fn()}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
