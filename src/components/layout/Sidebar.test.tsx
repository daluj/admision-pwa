import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { es } from '@/i18n/es'
import { renderApp } from '@/test/renderApp'

function sidebarLink(name: string) {
  const nav = screen.getByRole('navigation', { name: es.nav.label })
  return within(nav).getByRole('link', { name })
}

describe('Sidebar', () => {
  it('marks the current route as active', async () => {
    renderApp('/camas')
    await screen.findByRole('heading', { level: 1, name: es.pages.beds.title })

    expect(sidebarLink(es.nav.items.beds)).toHaveAttribute('aria-current', 'page')
    expect(sidebarLink(es.nav.items.overview)).not.toHaveAttribute('aria-current')
  })

  it('moves the active state when navigating', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByRole('heading', { level: 1, name: es.pages.overview.title })

    await user.click(sidebarLink(es.nav.items.transfers))

    expect(
      await screen.findByRole('heading', { level: 1, name: es.pages.transfers.title }),
    ).toBeInTheDocument()
    expect(sidebarLink(es.nav.items.transfers)).toHaveAttribute('aria-current', 'page')
    expect(sidebarLink(es.nav.items.overview)).not.toHaveAttribute('aria-current')
  })

  it('collapses to icons and remembers the choice', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp('/')
    await screen.findByRole('heading', { level: 1 })

    await user.click(screen.getByRole('button', { name: es.nav.collapse }))

    expect(sidebarLink(es.nav.items.beds)).toHaveTextContent('')
    expect(screen.getByRole('button', { name: es.nav.expand })).toBeInTheDocument()

    unmount()
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByRole('button', { name: es.nav.expand })).toBeInTheDocument()
  })
})
