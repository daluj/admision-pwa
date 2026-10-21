import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import type { DataBackend } from '@/data/ports'
import { ROLES, type Role, type Unit, type User } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { writeSession } from '@/features/auth/sessionStorage'

export const TEST_UNIT: Unit = {
  ...sampleEntities.unit,
  id: 'unit-test',
  code: 'TST-1',
  name: 'Unidad de prueba',
}

/** One fictitious user per role; the nurse supervisor belongs to `TEST_UNIT`. */
export const TEST_USERS: Record<Role, User> = Object.fromEntries(
  ROLES.map((role) => [
    role,
    {
      ...sampleEntities.user,
      id: `usr-${role}`,
      username: role.toLowerCase(),
      displayName: `Usuario ${role}`,
      role,
      ...(role === 'NURSE_SUPERVISOR' ? { unitId: TEST_UNIT.id } : { unitId: undefined }),
    },
  ]),
) as Record<Role, User>

export async function seedTestUsers(backend: DataBackend): Promise<void> {
  await backend.events.append(
    [],
    [
      { entity: 'unit', op: 'put', record: TEST_UNIT },
      ...Object.values(TEST_USERS).map((record) => ({
        entity: 'user' as const,
        op: 'put' as const,
        record,
      })),
    ],
  )
}

type RenderAppOptions = {
  /** Role to be logged in as (default: ADMISSIONS_HEAD). `null` renders anonymous. */
  as?: Role | null
}

/** Renders the full route tree in memory at `path`, with an in-memory data backend and a session. */
export function renderApp(
  path = '/',
  backend: DataBackend = createMemoryBackend(),
  { as = 'ADMISSIONS_HEAD' }: RenderAppOptions = {},
) {
  void seedTestUsers(backend)
  if (as) writeSession(TEST_USERS[as].id)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const result = render(
    <ThemeProvider>
      <DataProvider backend={backend}>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </DataProvider>
    </ThemeProvider>,
  )
  return { ...result, router, backend }
}
