import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import { es } from '@/i18n/es'
import { ensureDemoSeeded } from '@/simulator'
import { DemoDataCard } from './DemoDataCard'
import { DemoDataSection } from './DemoDataSection'

const copy = es.pages.settings.demo

function renderCard(overrides: Partial<Parameters<typeof DemoDataCard>[0]> = {}) {
  const onReset = vi.fn()
  render(
    <DemoDataCard
      currentSeed={42}
      startedAt="2026-10-20T06:00:00.000Z"
      fallbackSeed={42}
      busy={false}
      onReset={onReset}
      {...overrides}
    />,
  )
  return { onReset, user: userEvent.setup() }
}

const seedInput = () => screen.getByLabelText(copy.seedLabel)
const resetButton = () => screen.getByRole('button', { name: copy.reset })

describe('DemoDataCard', () => {
  it('shows the current seed and simulated start time', () => {
    renderCard()
    expect(screen.getByText(copy.currentSeed).nextElementSibling).toHaveTextContent('42')
    expect(screen.getByText(copy.startedAt).nextElementSibling).toHaveTextContent(
      '20/10/2026 08:00',
    )
    expect(seedInput()).toHaveValue('42')
  })

  it('shows "Sin generar" when there is no demo yet', () => {
    renderCard({ currentSeed: null, startedAt: null })
    expect(screen.getByText(copy.notSeeded)).toBeInTheDocument()
  })

  it.each(['', 'abc', '-1', '1.5', '1000000'])(
    'blocks reset for invalid seed %j',
    async (value) => {
      const { onReset, user } = renderCard()
      await user.clear(seedInput())
      if (value) await user.type(seedInput(), value)
      await user.click(resetButton())
      expect(screen.getByRole('alert')).toHaveTextContent(copy.seedInvalid)
      expect(seedInput()).toHaveAttribute('aria-invalid', 'true')
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(onReset).not.toHaveBeenCalled()
    },
  )

  it('confirming runs the reset with the typed seed', async () => {
    const { onReset, user } = renderCard()
    await user.clear(seedInput())
    await user.type(seedInput(), '7')
    await user.click(resetButton())
    const dialog = await screen.findByRole('alertdialog', { name: copy.confirmTitle })
    expect(dialog).toHaveTextContent(copy.confirmDescription(7))
    await user.click(screen.getByRole('button', { name: copy.confirm }))
    expect(onReset).toHaveBeenCalledWith(7)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('cancel (or Escape) does nothing', async () => {
    const { onReset, user } = renderCard()
    await user.click(resetButton())
    await user.click(await screen.findByRole('button', { name: copy.cancel }))
    await user.click(resetButton())
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(onReset).not.toHaveBeenCalled()
  })

  it('busy state disables the button and changes its label', () => {
    renderCard({ busy: true })
    expect(screen.getByRole('button', { name: copy.resetting })).toBeDisabled()
  })
})

describe('DemoDataSection', () => {
  it('resets the demo with the chosen seed and shows a toast', async () => {
    const backend = createMemoryBackend({
      clock: createFixedClock('2026-10-20T15:00:00.000Z'),
      validateSchemas: false,
    })
    await ensureDemoSeeded(backend)
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <DataProvider backend={backend}>
          <DemoDataSection />
          <Toaster />
        </DataProvider>
      </ThemeProvider>,
    )
    await waitFor(() =>
      expect(screen.getByText(copy.currentSeed).nextElementSibling).toHaveTextContent('42'),
    )

    await user.clear(seedInput())
    await user.type(seedInput(), '7')
    await user.click(resetButton())
    await user.click(await screen.findByRole('button', { name: copy.confirm }))

    expect(await screen.findByText(copy.success(7))).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText(copy.currentSeed).nextElementSibling).toHaveTextContent('7'),
    )
    const [event] = await backend.events.list()
    expect(event).toMatchObject({ seq: 1, type: 'DemoSeeded', payload: { seed: 7 } })
  })
})
