import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { es } from '@/i18n/es'
import { renderApp } from '@/test/renderApp'
import { ErrorBoundary } from './ErrorBoundary'

const copy = es.crash

// The crashing page: throws until `state.broken` is cleared (a retry then recovers).
const state = vi.hoisted(() => ({ broken: true }))
vi.mock('@/features/transfers/TransfersPage', () => ({
  default: function TransfersPage() {
    if (state.broken) throw new Error('boom en la página')
    return <h1>Traslados recuperados</h1>
  },
}))

beforeEach(() => {
  state.broken = true
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('route error element', () => {
  it('a crashing page shows the Spanish message inside the layout; the shell keeps working', async () => {
    renderApp('/traslados')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(copy.title)
    expect(alert).toHaveTextContent('boom en la página') // folded technical detail
    // Sidebar and top bar are still there and other pages still open.
    const nav = screen.getByRole('navigation', { name: es.nav.label })
    expect(within(nav).getByRole('link', { name: es.nav.items.beds })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: es.theme.toggle })).toBeInTheDocument()
    await userEvent.click(within(nav).getByRole('link', { name: es.nav.items.beds }))
    expect(
      await screen.findByRole('heading', { level: 1, name: es.pages.beds.title }),
    ).toBeInTheDocument()
  })

  it('"Reintentar" renders the page again and recovers once the problem is gone', async () => {
    renderApp('/traslados')
    await screen.findByRole('alert')
    state.broken = false
    await userEvent.click(screen.getByRole('button', { name: copy.retry }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Traslados recuperados' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('"Volver al inicio" goes to the overview', async () => {
    renderApp('/traslados')
    await userEvent.click(await screen.findByRole('link', { name: copy.home }))
    expect(
      await screen.findByRole('heading', { level: 1, name: es.pages.overview.title }),
    ).toBeInTheDocument()
  })

  it('logs the error to the console (no telemetry)', async () => {
    renderApp('/traslados')
    await screen.findByRole('alert')
    expect(console.error).toHaveBeenCalledWith('[route crash]', expect.any(Error))
  })
})

describe('global error boundary', () => {
  function Bomb(): never {
    throw new Error('provider failure')
  }

  it('shows the full-page fallback instead of a blank screen', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(copy.pageTitle)
    expect(alert).toHaveTextContent('provider failure')
    expect(screen.getByRole('button', { name: copy.reload })).toBeInTheDocument()
    expect(console.error).toHaveBeenCalledWith('[app crash]', expect.any(Error), expect.any(String))
  })

  it('renders its children when nothing fails', () => {
    render(
      <ErrorBoundary>
        <p>todo bien</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('todo bien')).toBeInTheDocument()
  })
})
