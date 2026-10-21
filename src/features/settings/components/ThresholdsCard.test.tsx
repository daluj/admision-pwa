import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_ALERT_CONFIG } from '@/domain/alerts'
import { ALERT_CONFIG_STORAGE_KEY, readAlertConfig } from '@/features/alerts/alertConfigStore'
import { es } from '@/i18n/es'
import { ThresholdsCard } from './ThresholdsCard'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const copy = es.pages.settings.thresholds
const field = (key: keyof typeof copy.fields) => screen.getByLabelText(copy.fields[key])

beforeEach(() => localStorage.clear())

describe('ThresholdsCard', () => {
  it('shows the defaults, occupancy as a percentage', () => {
    render(<ThresholdsCard />)
    expect(field('occupancyAlert')).toHaveValue('92')
    expect(field('occupancyCritical')).toHaveValue('97')
    expect(field('boardingLongWarnHours')).toHaveValue('4')
    expect(field('pendingCleaningCriticalMin')).toHaveValue('120')
    expect(field('balanceCritical')).toHaveValue('-10')
    expect(field('wallRotationSec')).toHaveValue('20')
  })

  it('saves valid values (percent back to a fraction) and they persist', async () => {
    const user = userEvent.setup()
    render(<ThresholdsCard />)
    await user.clear(field('occupancyAlert'))
    await user.type(field('occupancyAlert'), '90')
    await user.clear(field('wallRotationSec'))
    await user.type(field('wallRotationSec'), '45')
    await user.click(screen.getByRole('button', { name: copy.save }))
    expect(readAlertConfig()).toMatchObject({ occupancyAlert: 0.9, wallRotationSec: 45 })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('accepts a decimal comma', async () => {
    const user = userEvent.setup()
    render(<ThresholdsCard />)
    await user.clear(field('boardingLongWarnHours'))
    await user.type(field('boardingLongWarnHours'), '3,5')
    await user.click(screen.getByRole('button', { name: copy.save }))
    expect(readAlertConfig().boardingLongWarnHours).toBe(3.5)
  })

  it('refuses out-of-range values and warn ≥ critical, marking the fields and saving nothing', async () => {
    const user = userEvent.setup()
    render(<ThresholdsCard />)
    await user.clear(field('wallRotationSec'))
    await user.type(field('wallRotationSec'), '2')
    await user.clear(field('boardingLongCriticalHours'))
    await user.type(field('boardingLongCriticalHours'), '3')
    await user.click(screen.getByRole('button', { name: copy.save }))
    expect(screen.getByRole('alert')).toHaveTextContent(copy.invalid)
    expect(field('wallRotationSec')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(copy.errors.range(5, 120))).toBeInTheDocument()
    expect(field('boardingLongCriticalHours')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(copy.errors.order)).toBeInTheDocument()
    expect(localStorage.getItem(ALERT_CONFIG_STORAGE_KEY)).toBeNull()
  })

  it('refuses text that is not a number', async () => {
    const user = userEvent.setup()
    render(<ThresholdsCard />)
    await user.clear(field('balanceCritical'))
    await user.type(field('balanceCritical'), 'mucho')
    await user.click(screen.getByRole('button', { name: copy.save }))
    expect(screen.getByText(copy.errors.number)).toBeInTheDocument()
    await user.clear(field('balanceCritical'))
    await user.click(screen.getByRole('button', { name: copy.save }))
    expect(screen.getByText(copy.errors.number)).toBeInTheDocument()
  })

  it('restores the defaults', async () => {
    const user = userEvent.setup()
    render(<ThresholdsCard />)
    await user.clear(field('wallRotationSec'))
    await user.type(field('wallRotationSec'), '45')
    await user.click(screen.getByRole('button', { name: copy.save }))
    await user.click(screen.getByRole('button', { name: copy.reset }))
    expect(field('wallRotationSec')).toHaveValue('20')
    expect(readAlertConfig()).toEqual(DEFAULT_ALERT_CONFIG)
  })
})
