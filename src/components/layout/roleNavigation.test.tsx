import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ROLE_AREAS } from '@/domain/access'
import { ROLES } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { renderApp, TEST_UNIT } from '@/test/renderApp'
import { NAV_ITEMS } from './nav'

describe('role-based navigation', () => {
  it.each(ROLES)('%s sees only its areas in the sidebar', async (role) => {
    renderApp(role === 'PORTER' ? '/traslados' : '/', undefined, { as: role })
    await screen.findByRole('heading', { level: 1 })
    const nav = screen.getByRole('navigation', { name: es.nav.label })
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(labels).toEqual(
      NAV_ITEMS.filter((item) => ROLE_AREAS[role].includes(item.id)).map(
        (item) => es.nav.items[item.labelKey],
      ),
    )
  })

  it('shows the user, role and unit in the user menu and logs out', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/camas', undefined, { as: 'NURSE_SUPERVISOR' })
    await screen.findByRole('heading', { level: 1, name: TEST_UNIT.name })

    await user.click(screen.getByRole('button', { name: new RegExp(`^${es.topBar.user.menu}`) }))
    expect(await screen.findByText(es.roles.NURSE_SUPERVISOR)).toBeInTheDocument()
    expect(screen.getByText(`${es.topBar.user.unit}: ${TEST_UNIT.name}`)).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: es.topBar.user.logout }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(await screen.findByText(es.login.simulated)).toBeInTheDocument()
  })
})
