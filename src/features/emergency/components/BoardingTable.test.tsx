import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { computeEd } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { ED_NOW, edInput } from '@/test/edFixture'
import { BoardingTable } from './BoardingTable'

const copy = es.pages.emergency.boarding

const renderTable = (canManage: boolean, rows = computeEd(edInput).boarding) =>
  render(
    <MemoryRouter>
      <BoardingTable rows={rows} now={ED_NOW} canManage={canManage} />
    </MemoryRouter>,
  )

const bodyRows = () =>
  within(screen.getByRole('table', { name: copy.title }))
    .getAllByRole('row')
    .slice(1)

describe('BoardingTable', () => {
  it('lists boarders longest first with triage, specialty, unit type and time since the decision', () => {
    renderTable(false)
    const rows = bodyRows()
    expect(rows.map((r) => r.getAttribute('data-visit'))).toEqual(['v9', 'v8', 'v10'])
    expect(rows[0]).toHaveTextContent('9 h')
    expect(rows[0]!.querySelector('[data-level="2"]')).toHaveClass('bg-triage-2')
    expect(rows[0]).toHaveTextContent('Medicina Interna')
    expect(rows[0]).toHaveTextContent(es.pages.beds.unitTypes.WARD)
    expect(rows[1]).toHaveTextContent('5 h')
    expect(rows[2]).toHaveTextContent('1 h')
  })

  it('colours the wait: amber from 4 h, red from 8 h', () => {
    renderTable(false)
    const level = (row: HTMLElement) =>
      row.querySelector('td:nth-child(3) [data-level]')!.getAttribute('data-level')
    const [r9, r8, r10] = bodyRows()
    expect(level(r9!)).toBe('critical')
    expect(level(r8!)).toBe('warn')
    expect(level(r10!)).toBe('ok')
  })

  it('shows the three bed request states', () => {
    renderTable(false)
    const [noBed, reserved, transfer] = bodyRows()
    expect(noBed).toHaveAttribute('data-state', 'NO_BED')
    expect(noBed).toHaveTextContent(copy.states.noBed)
    expect(reserved).toHaveAttribute('data-state', 'RESERVED')
    expect(reserved).toHaveTextContent(copy.states.reserved('512-A', 'Cardiología 5ª Norte'))
    expect(transfer).toHaveAttribute('data-state', 'IN_TRANSFER')
    expect(transfer).toHaveTextContent(copy.states.inTransfer('513-B'))
  })

  it('marks isolation requests', () => {
    renderTable(false)
    expect(bodyRows()[0]).toHaveTextContent(copy.isolation)
    expect(bodyRows()[1]).not.toHaveTextContent(copy.isolation)
  })

  it('shows the link to Camas only to roles that can manage beds', () => {
    const { unmount } = renderTable(true)
    expect(screen.getByRole('link', { name: copy.manage })).toHaveAttribute('href', '/camas')
    unmount()
    renderTable(false)
    expect(screen.queryByRole('link', { name: copy.manage })).not.toBeInTheDocument()
  })

  it('shows an empty state without boarders (and no link)', () => {
    renderTable(true, [])
    expect(screen.getByText(copy.empty)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('never shows the full name or NHC', () => {
    renderTable(true)
    expect(screen.queryByText(/García/)).not.toBeInTheDocument()
    expect(screen.queryByText(/SIM-/)).not.toBeInTheDocument()
  })
})
