import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import { ROLES, type User } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { es } from '@/i18n/es'
import LoginPage from './LoginPage'
import { SessionProvider } from './SessionProvider'
import { readSession } from './sessionStorage'

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const unitA = { ...sampleEntities.unit, id: uid(901), code: 'CA-3A', name: 'Cardiología 3A' }
const unitB = { ...sampleEntities.unit, id: uid(902), code: 'NE-2B', name: 'Neumología 2B' }
const users: User[] = [
  ...ROLES.filter((role) => role !== 'NURSE_SUPERVISOR').map((role, i) => ({
    ...sampleEntities.user,
    id: uid(i + 1),
    username: role.toLowerCase(),
    displayName: `Persona ${role}`,
    role,
    unitId: undefined,
  })),
  {
    ...sampleEntities.user,
    id: uid(20),
    username: 'sa',
    displayName: 'Sup A',
    role: 'NURSE_SUPERVISOR',
    unitId: unitA.id,
  },
  {
    ...sampleEntities.user,
    id: uid(21),
    username: 'sb',
    displayName: 'Sup B',
    role: 'NURSE_SUPERVISOR',
    unitId: unitB.id,
  },
]

async function setup() {
  const backend = createMemoryBackend()
  await backend.events.append(
    [],
    [
      ...users.map((record) => ({ entity: 'user' as const, op: 'put' as const, record })),
      ...[unitA, unitB].map((record) => ({ entity: 'unit' as const, op: 'put' as const, record })),
    ],
  )
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <p>home</p> },
      { path: '/camas', element: <p>camas</p> },
    ],
    { initialEntries: ['/login'] },
  )
  render(
    <DataProvider backend={backend}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </DataProvider>,
  )
  return { router }
}

afterEach(() => window.localStorage.clear())

describe('LoginPage', () => {
  it('shows the simulated-access label and one card per role', async () => {
    await setup()
    expect(await screen.findByText(es.login.simulated)).toBeInTheDocument()
    const headings = await screen.findAllByRole('heading', { level: 2 })
    expect(headings.map((h) => h.textContent)).toEqual(ROLES.map((role) => es.roles[role]))
  })

  it('logs in as a role and redirects to its home', async () => {
    const { router } = await setup()
    await userEvent.click(
      await screen.findByRole('button', { name: es.login.enterAs(es.roles.ADMISSIONS_HEAD) }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(readSession()).toBe(uid(1))
  })

  it('requires a unit for nurse supervisors', async () => {
    const { router } = await setup()
    const enter = await screen.findByRole('button', {
      name: es.login.enterAs(es.roles.NURSE_SUPERVISOR),
    })
    expect(enter).toBeDisabled()
    const card = enter.closest('[data-slot="card"]') as HTMLElement
    await userEvent.selectOptions(within(card).getByLabelText(es.login.unitLabel), 'Neumología 2B')
    expect(enter).toBeEnabled()
    await userEvent.click(enter)
    await waitFor(() => expect(router.state.location.pathname).toBe('/camas'))
    expect(readSession()).toBe(uid(21))
  })
})
