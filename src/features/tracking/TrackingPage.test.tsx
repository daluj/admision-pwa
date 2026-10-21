import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { Role, User } from '@/domain/schemas'
import { writeSession } from '@/features/auth/sessionStorage'
import { es } from '@/i18n/es'
import { seedJourney } from '@/test/journeyFixture'
import { renderApp, TEST_USERS } from '@/test/renderApp'

const copy = es.pages.tracking

const SUPERVISOR: User = {
  ...TEST_USERS.NURSE_SUPERVISOR,
  id: 'usr-sup',
  username: 'sup',
  unitId: 'u1',
}
const ORPHAN: User = { ...SUPERVISOR, id: 'usr-orphan', username: 'orphan', unitId: undefined }

async function open(path: string, as: Role | User = 'ADMISSIONS_HEAD') {
  const backend = createMemoryBackend()
  let router!: ReturnType<typeof renderApp>['router']
  await seedJourney(backend)
  if (typeof as === 'string') {
    ;({ router } = renderApp(path, backend, { as }))
  } else {
    await backend.events.append([], [{ entity: 'user', op: 'put', record: as }])
    writeSession(as.id)
    ;({ router } = renderApp(path, backend, { as: null }))
  }
  await screen.findByRole('heading', { level: 1, name: copy.title })
  return { backend, router }
}

beforeEach(() => localStorage.clear())

describe('Seguimiento: search', () => {
  it('asks for a search until two characters are typed', async () => {
    const user = userEvent.setup()
    await open('/seguimiento')
    const box = await screen.findByLabelText(copy.search.label)
    await user.type(box, 'a')
    expect(screen.queryByRole('list', { name: copy.search.resultsLabel })).not.toBeInTheDocument()
    await user.type(box, 'n')
    const list = await screen.findByRole('list', { name: copy.search.resultsLabel })
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThan(0)
  })

  it('finds by NHC and shows the current situation', async () => {
    const user = userEvent.setup()
    await open('/seguimiento')
    await user.type(await screen.findByLabelText(copy.search.label), 'SIM-000C')
    const list = await screen.findByRole('list', { name: copy.search.resultsLabel })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Clara Soto Gil')
    expect(rows[0]).toHaveTextContent(copy.status.BED_RESERVED)
  })

  it('finds by name ignoring accents and says when nothing matches', async () => {
    const user = userEvent.setup()
    await open('/seguimiento')
    await user.type(await screen.findByLabelText(copy.search.label), 'nunez')
    expect(await screen.findByText('Inés Núñez Gil')).toBeInTheDocument()
    expect(screen.getByText(copy.search.noEpisode)).toBeInTheDocument()
    await user.clear(screen.getByLabelText(copy.search.label))
    await user.type(screen.getByLabelText(copy.search.label), 'zzz')
    expect(await screen.findByText(copy.search.none)).toBeInTheDocument()
  })

  it('never puts the search text (a name or NHC) in the URL', async () => {
    const user = userEvent.setup()
    const { router } = await open('/seguimiento')
    await user.type(await screen.findByLabelText(copy.search.label), 'SIM-000D')
    await user.click(await screen.findByRole('link', { name: /^Ver recorrido de D\. P\. R\./ }))
    await screen.findByRole('heading', { level: 2, name: 'Daniel Pons Ruiz' })
    expect(router.state.location.search).toBe('')
    expect(router.state.location.pathname).toBe('/seguimiento/p-d')
  })

  it('opens the journey from a result and goes back keeping the search', async () => {
    const user = userEvent.setup()
    await open('/seguimiento')
    await user.type(await screen.findByLabelText(copy.search.label), 'SIM-000D')
    await user.click(await screen.findByRole('link', { name: /^Ver recorrido de D\. P\. R\./ }))
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Daniel Pons Ruiz' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: copy.journey.back }))
    expect(await screen.findByLabelText(copy.search.label)).toHaveValue('SIM-000D')
  })
})

describe('Seguimiento: journey', () => {
  it('shows header, location, next step with ETA and the timeline states', async () => {
    await open('/seguimiento/p-c')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Clara Soto Gil' }),
    ).toBeInTheDocument()
    expect(screen.getByText('SIM-000C', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(copy.journey.location.ED('Boxes'))).toBeInTheDocument()
    expect(screen.getByText(copy.status.BED_RESERVED, { exact: false })).toBeInTheDocument()

    const next = screen
      .getByRole('heading', { level: 2, name: copy.journey.next.title })
      .closest('[data-slot="card"]')!
    expect(next).toHaveTextContent(copy.journey.steps.TransferPickedUp)
    expect(next).toHaveTextContent('Previsto: hoy 12:00')

    const timeline = screen.getByRole('list', { name: copy.journey.timeline.label })
    const items = within(timeline).getAllByRole('listitem')
    expect(items.map((i) => i.getAttribute('data-state'))).toEqual([
      'done',
      'done',
      'done',
      'done',
      'done',
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
    const current = items.find((i) => i.getAttribute('aria-current') === 'step')!
    expect(current).toHaveTextContent(copy.journey.steps.TransferPickedUp)
    expect(current).toHaveTextContent(copy.journey.timeline.current)
    expect(current).toHaveTextContent(copy.journey.timeline.elapsed('30 min'))
    expect(
      within(timeline).getByText(copy.journey.steps.BedReserved).closest('li'),
    ).toHaveTextContent('Cardiología 5ª Norte B3')
    expect(within(timeline).getByText(copy.journey.steps.Triaged).closest('li')).toHaveTextContent(
      copy.journey.triage(2),
    )
  })

  it('a finished episode has no next-step card', async () => {
    await open('/seguimiento/p-h')
    await screen.findByRole('list', { name: copy.journey.timeline.label })
    expect(screen.queryByRole('heading', { name: copy.journey.next.title })).not.toBeInTheDocument()
    expect(
      screen.getByText(es.pages.settings.eventLog.details.outcomes.DISCHARGED_HOME, {
        exact: false,
      }),
    ).toBeInTheDocument()
  })

  it('lists several episodes and switches between them', async () => {
    const user = userEvent.setup()
    await open('/seguimiento/p-j')
    const list = await screen.findByRole('list', { name: copy.journey.episodes.title })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    await user.click(within(list).getAllByRole('link')[1]!)
    const timeline = await screen.findByRole('list', { name: copy.journey.timeline.label })
    await waitFor(() =>
      expect(within(timeline).getByText(copy.journey.steps.EdArrived)).toBeInTheDocument(),
    )
    expect(screen.queryByRole('heading', { name: copy.journey.next.title })).not.toBeInTheDocument()
  })

  it('a patient without episodes says so; an unknown id is not found', async () => {
    await open('/seguimiento/p-i')
    expect(await screen.findByText(copy.journey.noEpisodes)).toBeInTheDocument()
  })

  it('an unknown patient is not found', async () => {
    await open('/seguimiento/nope')
    expect(await screen.findByText(copy.journey.notFound.title)).toBeInTheDocument()
  })

  it('porters cannot open Seguimiento', async () => {
    const backend = createMemoryBackend()
    await seedJourney(backend)
    renderApp('/seguimiento/p-c', backend, { as: 'PORTER' })
    await waitFor(() => expect(screen.queryByText('Clara Soto Gil')).not.toBeInTheDocument())
    expect(screen.queryByLabelText(copy.search.label)).not.toBeInTheDocument()
  })
})

describe('Seguimiento: nurse supervisor scope', () => {
  it("only finds patients of the supervisor's unit", async () => {
    await open('/seguimiento', SUPERVISOR)
    await userEvent.type(await screen.findByLabelText(copy.search.label), 'SIM-')
    const list = await screen.findByRole('list', { name: copy.search.resultsLabel })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((i) => i.getAttribute('data-patient'))
        .sort(),
    ).toEqual(['p-c', 'p-d'])
  })

  it('cannot open a patient of another unit, even by URL', async () => {
    await open('/seguimiento/p-e', SUPERVISOR)
    expect(await screen.findByText(copy.journey.notFound.title)).toBeInTheDocument()
    expect(screen.queryByText('Elena Gil Pardo')).not.toBeInTheDocument()
  })

  it('without a unit sees nobody', async () => {
    await open('/seguimiento', ORPHAN)
    await userEvent.type(await screen.findByLabelText(copy.search.label), 'SIM-')
    expect(await screen.findByText(copy.search.noneScoped)).toBeInTheDocument()
    await open('/seguimiento/p-c', ORPHAN)
  })
})
