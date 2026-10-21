import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BED_STATUSES } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { DurationText } from './DurationText'
import { ExceptionList, type ExceptionItem } from './ExceptionList'
import { KpiStrip } from './KpiStrip'
import { KpiTile } from './KpiTile'
import { StatusBadge } from './StatusBadge'

const withRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('KpiTile', () => {
  it('shows label, value, unit, context and target', () => {
    withRouter(
      <KpiStrip label="Indicadores">
        <KpiTile label="Ocupación" value={85} unit="%" context="510 de 600" target="umbral 92 %" />
      </KpiStrip>,
    )
    const strip = screen.getByRole('list', { name: 'Indicadores' })
    const tile = within(strip).getByRole('listitem')
    expect(tile).toHaveTextContent('Ocupación')
    expect(tile).toHaveTextContent('85')
    expect(tile).toHaveTextContent('%')
    expect(tile).toHaveTextContent('510 de 600')
    expect(tile).toHaveTextContent('umbral 92 %')
  })

  it.each([
    ['ok', 'border-l-status-ok', es.dashboard.status.ok],
    ['warn', 'border-l-status-warn', es.dashboard.status.warn],
    ['critical', 'border-l-status-critical', es.dashboard.status.critical],
  ] as const)('%s: colour class, icon and screen-reader text', (status, borderClass, text) => {
    withRouter(
      <KpiStrip label="k">
        <KpiTile label="X" value={1} status={status} />
      </KpiStrip>,
    )
    const tile = screen.getByRole('listitem')
    expect(tile.firstElementChild).toHaveClass(borderClass)
    expect(tile.querySelector('svg')).not.toBeNull()
    expect(within(tile).getByText(text)).toHaveClass('sr-only')
  })

  it('neutral has no icon and no status text; href makes it a link', () => {
    withRouter(
      <KpiStrip label="k">
        <KpiTile label="X" value={1} href="/camas" />
      </KpiStrip>,
    )
    const tile = screen.getByRole('listitem')
    expect(tile.querySelector('svg')).toBeNull()
    expect(within(tile).getByRole('link')).toHaveAttribute('href', '/camas')
  })
})

describe('StatusBadge', () => {
  it.each(BED_STATUSES)('%s shows the Spanish label with an icon', (status) => {
    render(<StatusBadge kind="bed" status={status} />)
    const badge = screen.getByText(es.pages.beds.status[status])
    expect(badge).toHaveAttribute('data-status', status)
    expect(badge.querySelector('svg')).not.toBeNull()
  })

  it('uses distinct colours for the statuses that mean different things', () => {
    const classes = BED_STATUSES.map((status) => {
      const { unmount, container } = render(<StatusBadge kind="bed" status={status} />)
      const value = container.firstElementChild!.className
      unmount()
      return value
    })
    // Reserved and cleaning share "info" by design; every other pair differs.
    expect(new Set(classes).size).toBeGreaterThanOrEqual(5)
  })
})

describe('DurationText', () => {
  const FROM = '2026-10-21T08:00:00.000Z'
  const at = (minutes: number) => new Date(Date.parse(FROM) + minutes * 60_000).toISOString()
  const target = { warnMs: 60 * 60_000, criticalMs: 120 * 60_000 }

  it('formats the elapsed time and never goes negative', () => {
    const { rerender } = render(<DurationText from={FROM} now={at(135)} />)
    expect(screen.getByText('2 h 15 min')).toBeInTheDocument()
    rerender(<DurationText from={at(10)} now={FROM} />)
    expect(screen.getByText('<1 min')).toBeInTheDocument()
  })

  it.each([
    [30, 'ok'],
    [60, 'warn'],
    [119, 'warn'],
    [120, 'critical'],
  ])('%i min against the target is %s', (minutes, level) => {
    render(<DurationText from={FROM} now={at(minutes)} target={target} />)
    expect(document.querySelector('[data-level]')).toHaveAttribute('data-level', level)
  })
})

describe('ExceptionList', () => {
  const item = (
    id: string,
    severity: ExceptionItem['severity'],
    ageMs: number,
    extra = {},
  ): ExceptionItem => ({
    id,
    severity,
    title: `Título ${id}`,
    ageMs,
    ...extra,
  })

  it('shows an empty message', () => {
    withRouter(<ExceptionList items={[]} />)
    expect(screen.getByText(es.dashboard.exceptions.empty)).toBeInTheDocument()
    expect(screen.getByText(es.dashboard.exceptions.title)).toBeInTheDocument()
  })

  it('orders by severity, then oldest first, with severity text for screen readers', () => {
    withRouter(
      <ExceptionList
        items={[
          item('i-old', 'info', 900),
          item('w-new', 'warn', 10),
          item('c', 'critical', 5),
          item('w-old', 'warn', 500),
        ]}
      />,
    )
    const rows = screen.getAllByRole('listitem')
    expect(rows.map((r) => r.getAttribute('data-severity'))).toEqual([
      'critical',
      'warn',
      'warn',
      'info',
    ])
    expect(rows[1]).toHaveTextContent('Título w-old')
    expect(rows[2]).toHaveTextContent('Título w-new')
    expect(
      within(rows[0]!).getByText(`${es.dashboard.status.critical}:`, { exact: false }),
    ).toHaveClass('sr-only')
  })

  it('limits to 8 and expands with "Ver todas"', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 12 }, (_, i) => item(`n${i}`, 'info', i))
    withRouter(<ExceptionList items={many} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(8)

    await user.click(screen.getByRole('button', { name: es.dashboard.exceptions.showAll(12) }))
    expect(screen.getAllByRole('listitem')).toHaveLength(12)
    await user.click(screen.getByRole('button', { name: es.dashboard.exceptions.showLess }))
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
  })

  it('has no toggle when everything fits and links items with an href', () => {
    withRouter(
      <ExceptionList items={[item('a', 'warn', 1, { href: '/camas/X', detail: 'Motivo: x' })]} />,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/camas/X')
    expect(screen.getByText('Motivo: x')).toBeInTheDocument()
  })
})
