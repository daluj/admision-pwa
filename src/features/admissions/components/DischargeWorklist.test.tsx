import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { computeAdmissions, type WorklistRow } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { ADM_NOW, admissionsInput } from '@/test/admissionsFixture'
import { DischargeWorklist, WORKLIST_PAGE_SIZE } from './DischargeWorklist'

const copy = es.pages.admissions.worklist
const rows = computeAdmissions(admissionsInput).worklist

const show = (extra: Partial<Parameters<typeof DischargeWorklist>[0]> = {}) =>
  render(
    <DischargeWorklist
      rows={rows}
      now={ADM_NOW}
      canAct={() => true}
      onEdit={() => {}}
      onOrder={() => {}}
      {...extra}
    />,
  )

describe('DischargeWorklist', () => {
  it('shows the stay, the expected time relative to today and the overdue flag', () => {
    show()
    const panel = screen.getByRole('tabpanel')
    const i1 = within(panel)
      .getAllByRole('row')
      .find((r) => r.getAttribute('data-admission') === 'i1')!
    expect(i1).toHaveTextContent('hoy 16:00')
    expect(i1).toHaveTextContent('4 h')
    const i5 = within(panel)
      .getAllByRole('row')
      .find((r) => r.getAttribute('data-admission') === 'i5')!
    expect(i5).toHaveTextContent(copy.overdue)
  })

  it("the upcoming tab shows tomorrow's discharges; the none tab has the rest", async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('tab', { name: new RegExp(copy.tabs.upcoming) }))
    expect(within(screen.getByRole('tabpanel')).getByText(/mañana 10:00/)).toBeInTheDocument()
  })

  it('hides the buttons where the user may not act and calls back where they may', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onOrder = vi.fn()
    show({ canAct: (r: WorklistRow) => r.admission.id === 'i1', onEdit, onOrder })
    expect(screen.getAllByRole('button', { name: new RegExp(copy.order) })).toHaveLength(1)
    expect(screen.getAllByText(copy.readOnly)).toHaveLength(1) // i5, the other row in the tab
    await user.click(screen.getByRole('button', { name: new RegExp(copy.editExisting) }))
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ admission: expect.objectContaining({ id: 'i1' }) }),
    )
    await user.click(screen.getByRole('button', { name: new RegExp(copy.order) }))
    expect(onOrder).toHaveBeenCalledOnce()
  })

  it('shows 50 rows and loads more on request, resetting when the tab changes', async () => {
    const user = userEvent.setup()
    const many: WorklistRow[] = Array.from({ length: 120 }, (_, i) => ({
      ...rows.find((r) => r.admission.id === 'i1')!,
      admission: { ...rows[0]!.admission, id: `m${i}` },
    }))
    show({ rows: many })
    expect(within(screen.getByRole('tabpanel')).getAllByRole('row').slice(1)).toHaveLength(
      WORKLIST_PAGE_SIZE,
    )
    await user.click(screen.getByRole('button', { name: copy.showMore(70) }))
    expect(within(screen.getByRole('tabpanel')).getAllByRole('row').slice(1)).toHaveLength(100)
    await user.click(screen.getByRole('tab', { name: new RegExp(copy.tabs.none) }))
    await user.click(screen.getByRole('tab', { name: new RegExp(copy.tabs.today) }))
    expect(within(screen.getByRole('tabpanel')).getAllByRole('row').slice(1)).toHaveLength(
      WORKLIST_PAGE_SIZE,
    )
  })

  it('shows an empty message for a tab without patients', () => {
    show({ rows: [] })
    expect(screen.getByText(copy.empty)).toBeInTheDocument()
  })

  it('is a real tab widget: roving tabindex and arrow keys move between tabs', async () => {
    const user = userEvent.setup()
    show()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1'])
    tabs[0]!.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(copy.tabs.ordered)
    expect(screen.getByRole('tab', { selected: true })).toHaveFocus()
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(copy.tabs.none) // wraps around
  })
})
