import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { computeEd } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { edInput } from '@/test/edFixture'
import { WaitChart } from './WaitChart'

const copy = es.pages.emergency.chart

describe('WaitChart', () => {
  it('has a card with the title and a 24-row hidden table in Madrid time', () => {
    render(<WaitChart hourly={computeEd(edInput).hourly} />)
    expect(screen.getAllByText(copy.title).length).toBeGreaterThan(0)
    const table = screen.getByRole('table', { name: copy.title })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual([copy.table.hour, copy.table.seen, copy.table.within, copy.table.pct])
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(24)
    // The last bucket is the current hour: 10:00Z = 12:00 in Madrid; the first is 23 hours earlier.
    expect(rows.at(-1)!.firstElementChild).toHaveTextContent('12:00')
    expect(rows[0]!.firstElementChild).toHaveTextContent('13:00')
  })

  it('shows the share and the counts for hours with patients, and "sin datos" for empty hours', () => {
    render(<WaitChart hourly={computeEd(edInput).hourly} />)
    const rows = within(screen.getByRole('table', { name: copy.title }))
      .getAllByRole('row')
      .slice(1)
    // 07:00Z = 09:00 Madrid: v11, v12 and v10, all within target.
    const nine = rows.find((r) => r.firstElementChild?.textContent === '09:00')!
    expect(nine).toHaveTextContent('09:00' + '3' + '3')
    expect(nine).toHaveTextContent('100 %')
    const empty = rows.filter((r) => r.textContent?.includes(copy.noData))
    expect(empty.length).toBeGreaterThan(5)
  })

  it('mentions the objective in the chart', () => {
    render(<WaitChart hourly={computeEd(edInput).hourly} />)
    expect(document.body.textContent).toContain(copy.objective(85))
  })
})
