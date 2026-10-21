import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ROLE_HOME } from '@/domain/access'
import { ROLES } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { renderApp } from '@/test/renderApp'

describe('route guards', () => {
  it('sends anonymous visitors to /login', async () => {
    const { router } = renderApp('/camas', undefined, { as: null })
    await screen.findByText(es.login.simulated)
    expect(router.state.location.pathname).toBe('/login')
  })

  it('does not flash the login page while a stored session resolves', async () => {
    const { router } = renderApp('/camas', undefined, { as: 'BED_MANAGER' })
    expect(screen.queryByText(es.login.simulated)).not.toBeInTheDocument()
    await screen.findByRole('heading', { level: 1, name: es.pages.beds.title })
    expect(router.state.location.pathname).toBe('/camas')
  })

  it('redirects an authenticated visitor away from /login', async () => {
    const { router } = renderApp('/login', undefined, { as: 'PORTER' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/traslados'))
  })

  it.each([
    ['PORTER', '/ajustes', '/traslados'],
    ['PORTER', '/camas', '/traslados'],
    ['MANAGEMENT', '/ajustes', '/'],
    ['NURSE_SUPERVISOR', '/urgencias', '/camas'],
    ['ED_COORDINATOR', '/traslados', '/urgencias'],
    ['BED_MANAGER', '/ajustes', '/'],
  ] as const)('%s opening %s lands on %s', async (role, from, to) => {
    const { router } = renderApp(from, undefined, { as: role })
    await waitFor(() => expect(router.state.location.pathname).toBe(to))
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('lets the head of admissions open settings', async () => {
    const { router } = renderApp('/ajustes')
    await screen.findByRole('heading', { level: 1, name: es.pages.settings.title })
    expect(router.state.location.pathname).toBe('/ajustes')
  })

  it.each(ROLES)('%s can open its home page', async (role) => {
    const { router } = renderApp(ROLE_HOME[role], undefined, { as: role })
    await screen.findByRole('heading', { level: 1 })
    expect(router.state.location.pathname).toBe(ROLE_HOME[role])
  })

  it('shows the 404 page only to authenticated users', async () => {
    const anonymous = renderApp('/no-existe', undefined, { as: null })
    await screen.findByText(es.login.simulated)
    expect(anonymous.router.state.location.pathname).toBe('/login')
    anonymous.unmount()

    renderApp('/no-existe', undefined, { as: 'PORTER' })
    expect(
      await screen.findByRole('heading', { level: 1, name: es.pages.notFound.title }),
    ).toBeInTheDocument()
  })
})
