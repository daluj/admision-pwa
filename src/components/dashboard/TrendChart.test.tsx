import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrendChart } from './TrendChart'

const points = [
  { label: '10:00', value: 90, detail: '9 de 10' },
  { label: '11:00', value: null },
  { label: '12:00', value: 60, detail: '3 de 5' },
]

const show = (extra = {}) =>
  render(
    <TrendChart
      title="Atendidos en objetivo"
      description="Descripción"
      points={points}
      seriesName="% en objetivo"
      reference={{ value: 85, label: 'Objetivo 85 %' }}
      formatValue={(v) => `${Math.round(v)} %`}
      noData="sin datos"
      table={{
        headers: ['Hora', '% en objetivo'],
        rows: [
          ['10:00', '90 %'],
          ['11:00', 'sin datos'],
          ['12:00', '60 %'],
        ],
      }}
      {...extra}
    />,
  )

describe('TrendChart', () => {
  it('is a labelled figure with a visually hidden data table carrying the same numbers', () => {
    show()
    const figure = screen.getByRole('figure', { name: 'Atendidos en objetivo' })
    const table = within(figure).getByRole('table', { name: 'Atendidos en objetivo' })
    expect(table).toHaveClass('sr-only')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Hora', '% en objetivo'])
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((r) => r.textContent)).toEqual(['10:0090 %', '11:00sin datos', '12:0060 %'])
  })

  it('hides the drawing from assistive technology (the table is the alternative)', () => {
    show()
    const drawing = document.querySelector('figure > div[aria-hidden="true"]')
    expect(drawing).not.toBeNull()
  })

  it('has the description for screen readers', () => {
    show()
    expect(screen.getByText(/Atendidos en objetivo\. Descripción/)).toHaveClass('sr-only')
  })

  it('draws the chart with its reference line label', () => {
    show()
    const svg = document.querySelector('figure svg')
    expect(svg).not.toBeNull()
    expect(document.body.textContent).toContain('Objetivo 85 %')
  })

  it('renders without a reference line', () => {
    show({ reference: undefined })
    expect(document.body.textContent).not.toContain('Objetivo 85 %')
    expect(screen.getByRole('figure')).toBeInTheDocument()
  })
})
