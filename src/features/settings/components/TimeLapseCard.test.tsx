import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { es } from '@/i18n/es'
import { resetDemo } from '@/simulator'
import { renderApp } from '@/test/renderApp'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const copy = es.timelapse

async function open() {
  const backend = createMemoryBackend({ clock: createFixedClock('2026-10-21T10:00:00.000Z') })
  await resetDemo(backend, 42)
  renderApp('/ajustes', backend)
  await screen.findByRole('heading', { level: 2, name: copy.title })
  return { backend }
}
const simNow = async (backend: Awaited<ReturnType<typeof open>>['backend']) =>
  (await backend.repositories.simulationState.get('current'))!.simNow

beforeEach(() => vi.clearAllMocks())

describe('Avance rápido', () => {
  it('jumps to a time of day, leaves the simulation paused there and toasts', async () => {
    const user = userEvent.setup()
    const { backend } = await open()
    const input = screen.getByLabelText(copy.timeLabel)
    await user.clear(input)
    await user.type(input, '08:30')
    await user.click(screen.getByRole('button', { name: copy.go }))
    await waitFor(async () => expect(await simNow(backend)).toBe('2026-10-21T06:30:00.000Z'), {
      timeout: 20_000,
    })
    const state = (await backend.repositories.simulationState.get('current'))!
    expect(state.running).toBe(false)
    const { toast } = await import('sonner')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(copy.done('08:30')))
  }, 40_000)

  it('pauses a running simulation before jumping', async () => {
    const user = userEvent.setup()
    const { backend } = await open()
    const state = (await backend.repositories.simulationState.get('current'))!
    await backend.events.append(
      [],
      [{ entity: 'simulationState', op: 'put', record: { ...state, running: true } }],
    )
    await user.click(screen.getByRole('button', { name: '08:00' })) // next 08:00 = tomorrow
    await waitFor(async () =>
      expect((await backend.events.list()).some((e) => e.type === 'SimulationPaused')).toBe(true),
    )
    await user.click(await screen.findByRole('button', { name: copy.cancel }))
    await waitFor(
      () => expect(screen.queryByRole('button', { name: copy.cancel })).not.toBeInTheDocument(),
      {
        timeout: 20_000,
      },
    )
    expect((await simNow(backend)) > '2026-10-21T06:00:00.000Z').toBe(true)
    expect((await simNow(backend)) < '2026-10-22T06:00:00.000Z').toBe(true)
  }, 60_000)

  it('rejects text that is not a time', async () => {
    const user = userEvent.setup()
    await open()
    const input = screen.getByLabelText(copy.timeLabel)
    await user.clear(input)
    await user.type(input, '25:99')
    await user.click(screen.getByRole('button', { name: copy.go }))
    expect(screen.getByRole('alert')).toHaveTextContent(copy.invalid)
  })

  it('says so when the scenario of the demo is unknown', async () => {
    const user = userEvent.setup()
    const { backend } = await open()
    const state = (await backend.repositories.simulationState.get('current'))!
    await backend.events.append(
      [],
      [{ entity: 'simulationState', op: 'put', record: { ...state, scenarioId: 'gone' } }],
    )
    await user.click(screen.getByRole('button', { name: '10:00' }))
    expect(await screen.findByText(copy.unknownScenario)).toBeInTheDocument()
  })
})
