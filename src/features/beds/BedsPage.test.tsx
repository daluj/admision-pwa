import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { sampleEntities } from '@/domain/schemas/fixtures'
import type { NewHospitalEvent } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { CENSUS_NOW, seedCensus } from '@/test/censusFixture'
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

const turnaroundEvents = (finishedAt: string, dischargedAt: string): NewHospitalEvent[] => [
  {
    id: '00000000-0000-4000-8000-0000000000a1',
    type: 'PatientDischarged',
    occurredAt: dischargedAt,
    actor: 'simulator',
    entityType: 'Admission',
    entityId: 'd1',
    payload: { bedId: 'A4' },
  },
  {
    id: '00000000-0000-4000-8000-0000000000a2',
    type: 'BedCleaningFinished',
    occurredAt: finishedAt,
    actor: 'simulator',
    entityType: 'Bed',
    entityId: 'A4',
    payload: {},
  },
]

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

  it("shows the bed turnaround: no data at first, then the median of today's cleanings", async () => {
    const backend = await openCensus()
    const turnaround = tile(copy.kpis.turnaround.label)
    expect(turnaround).toHaveTextContent('—')
    expect(turnaround).toHaveTextContent(copy.kpis.turnaround.none)
    expect(turnaround).toHaveTextContent(copy.kpis.turnaround.target(90))

    // Discharged 08:30Z, cleaned 10:00Z: 1 h 30 min (warn at the 90 min target).
    await act(() =>
      backend.events.append(
        turnaroundEvents('2026-10-21T10:00:00.000Z', '2026-10-21T08:30:00.000Z'),
        [],
      ),
    )
    await waitFor(() => expect(turnaround).toHaveTextContent('1 h 30 min'))
    expect(turnaround).toHaveTextContent(copy.kpis.turnaround.context(1))
    expect(turnaround).toHaveAttribute('data-status', 'warn')
  })

  it('a quick turnaround is ok and the strip has seven tiles', async () => {
    const backend = await openCensus()
    expect(
      within(screen.getByRole('list', { name: copy.kpis.label })).getAllByRole('listitem'),
    ).toHaveLength(7)
    await act(() =>
      backend.events.append(
        turnaroundEvents('2026-10-21T09:00:00.000Z', '2026-10-21T08:15:00.000Z'),
        [],
      ),
    )
    const turnaround = tile(copy.kpis.turnaround.label)
    await waitFor(() => expect(turnaround).toHaveTextContent('45 min'))
    expect(turnaround).toHaveAttribute('data-status', 'ok')
  })

  it('raises a pending-cleaning exception after an hour, critical after two', async () => {
    const backend = createMemoryBackend()
    await seedCensus(backend)
    const dirty = (id: string, minutesAgo: number) => ({
      entity: 'bed' as const,
      op: 'put' as const,
      record: {
        ...sampleEntities.bed,
        id,
        unitId: 'u-ward',
        label: id,
        status: 'PENDING_CLEANING' as const,
        statusChangedAt: new Date(Date.parse(CENSUS_NOW) - minutesAgo * 60_000).toISOString(),
      },
    })
    await backend.events.append([], [dirty('D1', 80), dirty('D2', 130), dirty('D3', 30)])
    renderApp('/camas', backend)
    expect(
      await screen.findByText(copy.exceptions.cleaningLong('D1', '1 h 20 min')),
    ).toBeInTheDocument()
    expect(screen.getByText(copy.exceptions.cleaningLong('D2', '2 h 10 min'))).toBeInTheDocument()
    expect(screen.queryByText(copy.exceptions.cleaningLong('D3', '30 min'))).not.toBeInTheDocument()
    const rows = screen.getAllByRole('listitem').filter((li) => li.hasAttribute('data-severity'))
    const d2 = rows.find((li) => li.textContent?.includes('D2'))!
    expect(d2).toHaveAttribute('data-severity', 'critical')
    expect(rows.find((li) => li.textContent?.includes('D1'))).toHaveAttribute(
      'data-severity',
      'warn',
    )
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
