import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { es } from '@/i18n/es'
import { seedCensus } from '@/test/censusFixture'
import { renderApp, TEST_USERS } from '@/test/renderApp'

const copy = es.pages.beds

async function openCensus() {
  const backend = createMemoryBackend()
  await seedCensus(backend)
  renderApp('/camas', backend)
  await screen.findByRole('list', { name: copy.kpis.label })
  return backend
}

const tile = (label: string) =>
  within(screen.getByRole('list', { name: copy.kpis.label }))
    .getByText(label)
    .closest('li')!

describe('BedsPage (census)', () => {
  it('shows the six KPIs of the fixture', async () => {
    await openCensus()
    // 3 occupied of 7 operational beds (one blocked) = 43 %.
    expect(tile(copy.kpis.occupancy.label)).toHaveTextContent('43')
    expect(tile(copy.kpis.occupancy.label)).toHaveTextContent(copy.kpis.occupancy.context(3, 7))
    expect(tile(copy.kpis.free.label)).toHaveTextContent(`1${copy.kpis.free.context(1)}`)
    expect(tile(copy.kpis.pendingCleaning.label)).toHaveTextContent(
      `1${copy.kpis.pendingCleaning.context(1)}`,
    )
    expect(tile(copy.kpis.blocked.label)).toHaveTextContent('1')
    expect(tile(copy.kpis.expectedDischarges.label)).toHaveTextContent(
      `2${copy.kpis.expectedDischarges.context(1)}`,
    )
    expect(tile(copy.kpis.outliers.label)).toHaveTextContent(`1${copy.kpis.outliers.context(1)}`)
  })

  it('lists exceptions and one card per unit with beds, linking to the bed map', async () => {
    await openCensus()
    expect(screen.getByText(es.dashboard.exceptions.title)).toBeInTheDocument()
    // The one-bed ICU is full, bed A6 has been blocked for 4 days, and one outlier.
    expect(screen.getByText(copy.exceptions.unitFull('UCI', 100))).toBeInTheDocument()
    expect(screen.getByText(copy.exceptions.blockedLong('A6', '4 d'))).toBeInTheDocument()
    expect(
      screen.getByText(copy.exceptions.outlier('L. P. G.', 'Cardiología 5ª Norte')),
    ).toBeInTheDocument()

    const grid = screen.getByRole('region', { name: copy.grid.title })
    const links = within(grid).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/camas/CAR-5N', '/camas/UCI'])
    expect(within(grid).getByRole('link', { name: copy.grid.openUnit('UCI') })).toHaveTextContent(
      '100 %',
    )
  })

  it('filters narrow the KPIs, the exceptions and the grid together, and are remembered', async () => {
    const user = userEvent.setup()
    await openCensus()
    await user.selectOptions(screen.getByLabelText(copy.filters.type), 'ICU')

    const grid = screen.getByRole('region', { name: copy.grid.title })
    expect(within(grid).getAllByRole('link')).toHaveLength(1)
    expect(tile(copy.kpis.occupancy.label)).toHaveTextContent('100')
    expect(screen.queryByText(copy.exceptions.blockedLong('A6', '4 d'))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.filters.clear })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: copy.filters.clear }))
    expect(within(grid).getAllByRole('link')).toHaveLength(2)
  })

  it('ignores a saved filter the hospital no longer has', async () => {
    window.localStorage.setItem(
      `torre-control.filters.beds.${TEST_USERS.ADMISSIONS_HEAD.id}`,
      JSON.stringify({ building: 'Edificio Fantasma', type: 'all', specialty: 'all' }),
    )
    await openCensus()
    const grid = screen.getByRole('region', { name: copy.grid.title })
    expect(within(grid).getAllByRole('link')).toHaveLength(2)
    expect(screen.getByLabelText(copy.filters.building)).toHaveValue('all')
  })

  it('names the specialty of an outlier in the exception detail', async () => {
    await openCensus()
    expect(
      screen.getByText(copy.exceptions.outlierDetail('A2', 'Medicina Interna')),
    ).toBeInTheDocument()
  })

  it('shows a message when no unit matches', async () => {
    const user = userEvent.setup()
    await openCensus()
    await user.selectOptions(screen.getByLabelText(copy.filters.building), 'Edificio Sur')
    await user.selectOptions(screen.getByLabelText(copy.filters.type), 'WARD')
    expect(screen.getByText(copy.grid.noMatches)).toBeInTheDocument()
  })

  it('shows the empty state when there are no beds', async () => {
    const empty = createMemoryBackend()
    await empty.events.append(
      [],
      [{ entity: 'simulationState', op: 'put', record: sampleEntities.simulationState }],
    )
    renderApp('/camas', empty)
    expect(await screen.findByText(copy.emptyTitle)).toBeInTheDocument()
  })
})
