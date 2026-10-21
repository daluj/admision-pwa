import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { DataBackend } from '@/data/ports'
import type { Role } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { es } from '@/i18n/es'
import { renderApp, TEST_USERS } from '@/test/renderApp'

async function backendWithSimulation(
  overrides: Partial<typeof sampleEntities.simulationState> = {},
): Promise<DataBackend> {
  const backend = createMemoryBackend()
  await backend.events.append(
    [],
    [
      {
        entity: 'simulationState',
        op: 'put',
        record: { ...sampleEntities.simulationState, ...overrides },
      },
    ],
  )
  return backend
}

const setSim = (backend: DataBackend, overrides: Partial<typeof sampleEntities.simulationState>) =>
  act(() =>
    backend.events.append(
      [],
      [
        {
          entity: 'simulationState',
          op: 'put',
          record: { ...sampleEntities.simulationState, ...overrides },
        },
      ],
    ),
  )

async function open(role: Role, overrides = {}) {
  const backend = await backendWithSimulation(overrides)
  renderApp('/', backend, { as: role })
  await screen.findByRole('heading', { level: 1 })
  return backend
}

describe('simulated clock', () => {
  it('shows the simulated time in Madrid and follows simNow', async () => {
    const backend = await open('PORTER', { simNow: '2026-10-20T06:00:00.000Z' })
    // The porter lands on Traslados; the clock is read-only for every role.
    expect(await screen.findByText('08:00')).toBeInTheDocument()

    await setSim(backend, { simNow: '2026-10-20T09:15:00.000Z' })
    expect(await screen.findByText('11:15')).toBeInTheDocument()
  })

  it('shows a placeholder before the demo is seeded', async () => {
    renderApp('/', createMemoryBackend(), { as: 'ADMISSIONS_HEAD' })
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText(es.topBar.clock.unknown)).toBeInTheDocument()
  })
})

describe('simulation controls', () => {
  it.each(['BED_MANAGER', 'NURSE_SUPERVISOR', 'ED_COORDINATOR', 'PORTER', 'MANAGEMENT'] as const)(
    'are hidden for %s',
    async (role) => {
      await open(role)
      expect(screen.queryByRole('group', { name: es.simulation.controls })).not.toBeInTheDocument()
    },
  )

  it('start and pause emit control events and update the state', async () => {
    const user = userEvent.setup()
    const backend = await open('ADMISSIONS_HEAD')
    const group = await screen.findByRole('group', { name: es.simulation.controls })

    await user.click(within(group).getByRole('button', { name: es.simulation.start }))
    await waitFor(async () =>
      expect((await backend.events.list()).map((e) => e.type)).toEqual(['SimulationStarted']),
    )
    // Done by a person: the event carries the user, not "simulator".
    expect((await backend.events.list())[0]!.actor).toBe(TEST_USERS.ADMISSIONS_HEAD.id)
    expect(await backend.repositories.simulationState.get('current')).toMatchObject({
      running: true,
    })

    await user.click(await within(group).findByRole('button', { name: es.simulation.pause }))
    await waitFor(async () =>
      expect((await backend.events.list()).map((e) => e.type)).toEqual([
        'SimulationStarted',
        'SimulationPaused',
      ]),
    )
  })

  it('changes the speed through the menu', async () => {
    const user = userEvent.setup()
    const backend = await open('ADMISSIONS_HEAD', { speed: 60 })
    const group = await screen.findByRole('group', { name: es.simulation.controls })

    await user.click(within(group).getByRole('button', { name: `${es.simulation.speed}: 60×` }))
    await user.click(await screen.findByRole('menuitemradio', { name: '300×' }))

    await waitFor(async () => {
      const [event] = await backend.events.list()
      expect(event).toMatchObject({ type: 'SimulationSpeedChanged', payload: { speed: 300 } })
    })
    expect(
      await screen.findByRole('button', { name: `${es.simulation.speed}: 300×` }),
    ).toBeInTheDocument()
  })
})
