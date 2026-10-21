import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DEFAULT_ALERT_CONFIG } from '@/domain/alerts'
import type { Role } from '@/domain/schemas'
import { writeAlertConfig } from '@/features/alerts/alertConfigStore'
import { es } from '@/i18n/es'
import { seedAlerts } from '@/test/alertsFixture'
import { renderApp } from '@/test/renderApp'

const copy = es.wall
const SECONDS = 10

async function open(as: Role = 'ADMISSIONS_HEAD') {
  writeAlertConfig({ ...DEFAULT_ALERT_CONFIG, wallRotationSec: SECONDS })
  const backend = createMemoryBackend()
  await seedAlerts(backend)
  const app = renderApp('/pantalla', backend, { as })
  await screen.findByRole('heading', { level: 1, name: copy.title })
  return app
}
const slideName = () => screen.getByRole('main').getAttribute('aria-label')
const dots = () =>
  within(screen.getByRole('navigation', { name: copy.slides })).getAllByRole('button')

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

/** Only the rotation timers are fake; real time still flows so async rendering and waits keep working. */
const fakeTimers = () =>
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true })

describe('wall mode', () => {
  it('renders full screen without sidebar, dark, with the status level, clock and pending alerts', async () => {
    await open()
    expect(document.querySelector('[data-wall]')).toHaveClass('dark')
    expect(screen.queryByRole('navigation', { name: es.nav.label })).not.toBeInTheDocument()
    expect(screen.getByText(es.topBar.statusLevel.label, { exact: false })).toBeInTheDocument()
    expect(screen.getByText(copy.pending(0))).toBeInTheDocument()
    expect(slideName()).toBe(copy.slide(1, 5, es.nav.items.overview))
    expect(
      await screen.findByRole('heading', { level: 2, name: es.pages.overview.status.title }),
    ).toBeInTheDocument()
  })

  it('has one dot per dashboard the role can open', async () => {
    await open('ED_COORDINATOR')
    expect(dots()).toHaveLength(3) // overview, beds, emergency
    expect(dots().map((d) => d.getAttribute('aria-label'))).toEqual([
      copy.slide(1, 3, es.nav.items.overview),
      copy.slide(2, 3, es.nav.items.beds),
      copy.slide(3, 3, es.nav.items.emergency),
    ])
  })

  it('rotates to the next dashboard after the configured seconds and wraps around', async () => {
    fakeTimers()
    await open('ED_COORDINATOR')
    await act(() => vi.advanceTimersByTimeAsync(SECONDS * 1000))
    expect(slideName()).toBe(copy.slide(2, 3, es.nav.items.beds))
    await act(() => vi.advanceTimersByTimeAsync(SECONDS * 1000))
    expect(slideName()).toBe(copy.slide(3, 3, es.nav.items.emergency))
    await act(() => vi.advanceTimersByTimeAsync(SECONDS * 1000))
    expect(slideName()).toBe(copy.slide(1, 3, es.nav.items.overview))
  })

  it('pause stops the rotation and resume restarts it', async () => {
    fakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await open('ED_COORDINATOR')
    await user.click(screen.getByRole('button', { name: copy.pause }))
    expect(screen.getByRole('button', { name: copy.play })).toHaveAttribute('aria-pressed', 'true')
    await act(() => vi.advanceTimersByTimeAsync(SECONDS * 3000))
    expect(slideName()).toBe(copy.slide(1, 3, es.nav.items.overview))
    await user.click(screen.getByRole('button', { name: copy.play }))
    await act(() => vi.advanceTimersByTimeAsync(SECONDS * 1000))
    expect(slideName()).toBe(copy.slide(2, 3, es.nav.items.beds))
  })

  it('arrow keys, the dots and the buttons move between dashboards; space pauses; F is fullscreen', async () => {
    const user = userEvent.setup()
    await open('MANAGEMENT')
    await user.keyboard('{ArrowRight}')
    expect(slideName()).toBe(copy.slide(2, 5, es.nav.items.beds))
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(slideName()).toBe(copy.slide(5, 5, es.nav.items.transfers)) // wraps backwards
    await user.click(dots()[2]!)
    expect(slideName()).toBe(copy.slide(3, 5, es.nav.items.emergency))
    await user.click(screen.getByRole('button', { name: copy.next }))
    expect(slideName()).toBe(copy.slide(4, 5, es.nav.items.admissions))
    await user.click(screen.getByRole('button', { name: copy.previous }))
    expect(slideName()).toBe(copy.slide(3, 5, es.nav.items.emergency))
    ;(document.activeElement as HTMLElement).blur() // a focused button keeps its own space key
    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: copy.play })).toBeInTheDocument()
  })

  it('shows the dashboard of the current slide', async () => {
    const user = userEvent.setup()
    await open()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(
      await screen.findByRole('heading', { level: 1, name: es.pages.emergency.title }),
    ).toBeInTheDocument()
  })

  it('Escape and the exit button go back to the application', async () => {
    const user = userEvent.setup()
    const { router } = await open()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    router.navigate('/pantalla')
    await screen.findByRole('heading', { level: 1, name: copy.title })
    await user.click(screen.getByRole('button', { name: copy.exit }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('is only for roles that can open the overview', async () => {
    const backend = createMemoryBackend()
    await seedAlerts(backend)
    const { router } = renderApp('/pantalla', backend, { as: 'PORTER' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/traslados'))
    expect(screen.queryByRole('heading', { level: 1, name: copy.title })).not.toBeInTheDocument()
  })
})

describe('wall link', () => {
  it('is in the top bar for roles with overview access and links to the wall', async () => {
    const backend = createMemoryBackend()
    await seedAlerts(backend)
    renderApp('/', backend, { as: 'MANAGEMENT' })
    expect(await screen.findByRole('link', { name: copy.link })).toHaveAttribute(
      'href',
      '/pantalla',
    )
  })

  it('is absent for a nurse supervisor', async () => {
    const backend = createMemoryBackend()
    await seedAlerts(backend)
    renderApp('/camas', backend, { as: 'NURSE_SUPERVISOR' })
    await screen.findByRole('button', { name: new RegExp(`^${es.topBar.alerts.label}`) })
    expect(screen.queryByRole('link', { name: copy.link })).not.toBeInTheDocument()
  })
})
