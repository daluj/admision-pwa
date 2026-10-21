import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { Role } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { es } from '@/i18n/es'
import { seedEd } from '@/test/edFixture'
import { renderApp } from '@/test/renderApp'

const copy = es.pages.emergency

async function open(as: Role = 'ADMISSIONS_HEAD') {
  const backend = createMemoryBackend()
  await seedEd(backend)
  const app = renderApp('/urgencias', backend, { as })
  await screen.findByRole('list', { name: copy.kpis.label })
  return { ...app, backend }
}

const tile = (label: string) =>
  within(screen.getByRole('list', { name: copy.kpis.label }))
    .getByText(label)
    .closest('li')!

describe('Urgencias page', () => {
  it('shows the six KPIs of the fixture', async () => {
    await open()
    expect(tile(copy.kpis.present.label)).toHaveTextContent(`10${copy.kpis.present.context(8, 2)}`)
    expect(tile(copy.kpis.waitingTriage.label)).toHaveTextContent(
      `2${copy.kpis.waitingTriage.context('40 min')}`,
    )
    expect(tile(copy.kpis.waitingPhysician.label)).toHaveTextContent(
      `4${copy.kpis.waitingPhysician.context(3)}`,
    )
    expect(tile(copy.kpis.waitingPhysician.label)).toHaveAttribute('data-status', 'critical') // L1/L2 over target
    expect(tile(copy.kpis.boarding.label)).toHaveTextContent(`3${copy.kpis.boarding.context(2)}`)
    expect(tile(copy.kpis.longestBoarding.label)).toHaveTextContent('9 h')
    expect(tile(copy.kpis.longestBoarding.label)).toHaveAttribute('data-status', 'critical')
    // v8 ✓, v10 ✓, v11 ✓, v12 ✓ of 7 seen in 24 h = 57 %.
    expect(tile(copy.kpis.withinTarget.label)).toHaveTextContent('57%')
    expect(tile(copy.kpis.withinTarget.label)).toHaveTextContent(
      copy.kpis.withinTarget.context(4, 7),
    )
  })

  it('puts the exceptions first, then the board, the boarding list and the chart', async () => {
    await open()
    expect(screen.getByText(es.dashboard.exceptions.title)).toBeInTheDocument()
    expect(screen.getByText(/pendiente de cama desde hace 9 h/).closest('li')).toHaveAttribute(
      'data-severity',
      'critical',
    )

    const board = screen.getByRole('region', { name: copy.board.title })
    expect(within(board).getAllByRole('heading', { level: 3 })).toHaveLength(4)
    expect(document.querySelectorAll('[data-phase] [data-visit]')).toHaveLength(10)

    expect(
      within(screen.getByRole('table', { name: copy.boarding.title })).getAllByRole('row'),
    ).toHaveLength(4)
    expect(screen.getByRole('table', { name: copy.chart.title })).toBeInTheDocument()

    // Reading order: KPIs, exceptions, board, boarding, chart.
    const order = [
      screen.getByRole('list', { name: copy.kpis.label }),
      screen.getByText(es.dashboard.exceptions.title),
      board,
      screen.getByRole('table', { name: copy.boarding.title }),
      screen.getByRole('figure', { name: copy.chart.title }),
    ]
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }
  })

  it('updates live: a patient moving to the next phase changes the board and the KPIs', async () => {
    const { backend } = await open()
    const v1 = (await backend.repositories.edVisit.get('v1'))!
    await act(() =>
      backend.events.append(
        [],
        [
          {
            entity: 'edVisit',
            op: 'put',
            record: {
              ...v1,
              phase: 'TRIAGED',
              triageLevel: 3,
              triagedAt: '2026-10-21T09:55:00.000Z',
              area: 'BOXES',
            },
          },
        ],
      ),
    )
    await waitFor(() =>
      expect(tile(copy.kpis.waitingTriage.label)).toHaveTextContent(
        `1${copy.kpis.waitingTriage.context('40 min')}`,
      ),
    )
    expect(tile(copy.kpis.waitingPhysician.label)).toHaveTextContent('5')
  })

  it('shows a loading message until the data arrives, and an empty state without visits', async () => {
    const empty = createMemoryBackend()
    renderApp('/urgencias', empty)
    expect(await screen.findByRole('status')).toHaveTextContent(copy.loading)
    await act(() =>
      empty.events.append(
        [],
        [{ entity: 'simulationState', op: 'put', record: sampleEntities.simulationState }],
      ),
    )
    expect(await screen.findByText(copy.emptyTitle)).toBeInTheDocument()
  })
})

describe('Urgencias page: roles', () => {
  it.each(['ADMISSIONS_HEAD', 'MANAGEMENT', 'ED_COORDINATOR'] as const)(
    '%s can open it',
    async (role) => {
      const { router } = await open(role)
      expect(router.state.location.pathname).toBe('/urgencias')
    },
  )

  it('only the head sees the link to Camas from the boarding list', async () => {
    const { unmount } = await open('ADMISSIONS_HEAD')
    expect(screen.getByRole('link', { name: copy.boarding.manage })).toHaveAttribute(
      'href',
      '/camas',
    )
    unmount()
    for (const role of ['ED_COORDINATOR', 'MANAGEMENT'] as const) {
      const { unmount: close } = await open(role)
      expect(screen.queryByRole('link', { name: copy.boarding.manage })).not.toBeInTheDocument()
      close()
    }
  })

  it.each([
    ['BED_MANAGER', '/'],
    ['NURSE_SUPERVISOR', '/camas'],
    ['PORTER', '/traslados'],
  ] as const)('%s is redirected to %s', async (role, home) => {
    const backend = createMemoryBackend()
    await seedEd(backend)
    const { router } = renderApp('/urgencias', backend, { as: role })
    await waitFor(() => expect(router.state.location.pathname).not.toBe('/urgencias'))
    // Nurse supervisors land on their unit's bed map, under /camas.
    expect(
      router.state.location.pathname.startsWith('/camas/') ||
        router.state.location.pathname === home,
    ).toBe(true)
  })
})
