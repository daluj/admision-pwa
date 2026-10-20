import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/i18n/es'
import { renderApp } from '@/test/renderApp'
import { NAV_ITEMS } from './nav'

describe('AppShell', () => {
  it('renders all nav items with Spanish labels and the demo banner', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1, name: es.pages.overview.title })

    const nav = screen.getByRole('navigation', { name: es.nav.label })
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(7)
    expect(links.map((link) => link.textContent)).toEqual(
      NAV_ITEMS.map((item) => es.nav.items[item.labelKey]),
    )
    expect(screen.getByText('Entorno de demostración — datos ficticios')).toBeInTheDocument()
  })

  it('renders the top bar placeholders', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })

    expect(screen.getByText(es.topBar.statusLevel.normal)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: `${es.topBar.alerts.label}: ${es.topBar.alerts.empty}` }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: es.theme.toggle })).toBeInTheDocument()
    expect(screen.getByText(es.topBar.user.guest)).toBeInTheDocument()
  })

  it('renders the 404 page for unknown routes', async () => {
    renderApp('/no-existe')
    expect(
      await screen.findByRole('heading', { level: 1, name: es.pages.notFound.title }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: es.pages.notFound.backHome })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
