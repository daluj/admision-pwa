import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import type { HospitalEvent } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { EventLogCard } from './EventLogCard'
import { EventLogSection } from './EventLogSection'

const copy = es.pages.settings.eventLog

const make = (
  seq: number,
  type: HospitalEvent['type'],
  entityType: HospitalEvent['entityType'],
  at: string,
) =>
  ({
    seq,
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    type,
    entityType,
    entityId: `entity-${seq}`,
    occurredAt: at,
    actor: 'simulator',
    payload: type === 'BedBlocked' ? { reason: 'Avería' } : {},
  }) as HospitalEvent

const EVENTS = [
  make(3, 'BedBlocked', 'Bed', '2026-10-21T10:00:00.000Z'),
  make(2, 'BedCleaningStarted', 'Bed', '2026-10-21T09:00:00.000Z'),
  make(1, 'SimulationStarted', 'SimulationState', '2026-10-20T08:00:00.000Z'),
]

describe('EventLogCard', () => {
  it('renders one row per event with Spanish labels and the simulated time', () => {
    render(
      <EventLogCard
        events={EVENTS}
        simNow="2026-10-21T10:00:00.000Z"
        canLoadMore={false}
        onLoadMore={() => {}}
      />,
    )
    const table = screen.getByRole('table', { name: copy.title })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)
    expect(within(rows[0]!).getByText(copy.types.BedBlocked)).toBeInTheDocument()
    expect(within(rows[0]!).getByText('21/10/2026 12:00')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('Motivo: Avería')).toBeInTheDocument()
    expect(within(rows[0]!).getByText(copy.simulator)).toBeInTheDocument()
  })

  it('filters by type, entity and window', async () => {
    const user = userEvent.setup()
    render(
      <EventLogCard
        events={EVENTS}
        simNow="2026-10-21T10:00:00.000Z"
        canLoadMore={false}
        onLoadMore={() => {}}
      />,
    )
    const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

    await user.selectOptions(screen.getByLabelText(copy.type), 'BedBlocked')
    expect(bodyRows()).toHaveLength(1)

    await user.selectOptions(screen.getByLabelText(copy.type), 'all')
    await user.selectOptions(screen.getByLabelText(copy.entity), 'Bed')
    expect(bodyRows()).toHaveLength(2)

    await user.selectOptions(screen.getByLabelText(copy.entity), 'all')
    await user.selectOptions(screen.getByLabelText(copy.window), '1h')
    expect(bodyRows()).toHaveLength(2)
  })

  it('shows empty states', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <EventLogCard events={[]} simNow={undefined} canLoadMore={false} onLoadMore={() => {}} />,
    )
    expect(screen.getByText(copy.empty)).toBeInTheDocument()
    expect(screen.getByText(copy.emptyHint)).toBeInTheDocument()

    rerender(
      <EventLogCard events={EVENTS} simNow={undefined} canLoadMore={false} onLoadMore={() => {}} />,
    )
    await user.selectOptions(screen.getByLabelText(copy.type), 'BedUnblocked')
    expect(screen.getByText(copy.empty)).toBeInTheDocument()
    expect(screen.queryByText(copy.emptyHint)).not.toBeInTheDocument()
  })

  it('shows loading and a "load more" button only when more may exist', async () => {
    const user = userEvent.setup()
    const onLoadMore = vi.fn()
    const { rerender } = render(
      <EventLogCard
        events={undefined}
        simNow={undefined}
        canLoadMore={false}
        onLoadMore={onLoadMore}
      />,
    )
    expect(screen.getByText(copy.loading)).toBeInTheDocument()

    rerender(
      <EventLogCard events={EVENTS} simNow={undefined} canLoadMore onLoadMore={onLoadMore} />,
    )
    await user.click(screen.getByRole('button', { name: copy.loadMore }))
    expect(onLoadMore).toHaveBeenCalledOnce()
    expect(screen.getByText(copy.showing(3, 3))).toBeInTheDocument()

    rerender(
      <EventLogCard
        events={EVENTS}
        simNow={undefined}
        canLoadMore={false}
        onLoadMore={onLoadMore}
      />,
    )
    expect(screen.queryByRole('button', { name: copy.loadMore })).not.toBeInTheDocument()
  })
})

describe('EventLogCard actors', () => {
  it('shows who did it: the simulator, a known user or a short id', () => {
    const people = [
      {
        ...make(3, 'SimulationPaused', 'SimulationState', '2026-10-21T10:00:00.000Z'),
        actor: 'usr-head',
      },
      {
        ...make(2, 'SimulationStarted', 'SimulationState', '2026-10-21T09:00:00.000Z'),
        actor: 'usr-unknown-long-id',
      },
      make(1, 'BedUnblocked', 'Bed', '2026-10-21T08:00:00.000Z'),
    ] as HospitalEvent[]
    render(
      <EventLogCard
        events={people}
        simNow={undefined}
        actors={new Map([['usr-head', 'Sergio Medina']])}
        canLoadMore={false}
        onLoadMore={() => {}}
      />,
    )
    expect(screen.getByText('Sergio Medina')).toBeInTheDocument()
    expect(screen.getByText('usr-unkn')).toBeInTheDocument()
    expect(screen.getByText(copy.simulator)).toBeInTheDocument()
  })
})

describe('EventLogSection', () => {
  it('shows new events as they are appended and pages with "Cargar más"', async () => {
    const user = userEvent.setup()
    const backend = createMemoryBackend()
    render(
      <DataProvider backend={backend}>
        <EventLogSection />
      </DataProvider>,
    )
    expect(await screen.findByText(copy.empty)).toBeInTheDocument()

    const append = (n: number) =>
      act(() =>
        backend.events.append(
          Array.from({ length: n }, (_, i) => ({
            id: crypto.randomUUID(),
            type: 'BedUnblocked' as const,
            occurredAt: '2026-10-21T08:00:00.000Z',
            actor: 'simulator' as const,
            entityType: 'Bed' as const,
            entityId: `bed-${i}`,
            payload: {},
          })),
          [],
        ),
      )

    await append(1)
    expect(
      within(await screen.findByRole('table')).getByText(copy.types.BedUnblocked),
    ).toBeInTheDocument()

    await append(120)
    expect(await screen.findByText(copy.showing(100, 100))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: copy.loadMore }))
    expect(await screen.findByText(copy.showing(121, 121))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.loadMore })).not.toBeInTheDocument()
  })
})
