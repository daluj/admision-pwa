import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { computeAdmissions, type WorklistRow } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { admissionsInput } from '@/test/admissionsFixture'
import type { DischargeResult } from '../useDischargeActions'
import { OrderSheet } from './OrderSheet'

const copy = es.pages.admissions.orderSheet
const [a, b] = computeAdmissions(admissionsInput).worklist as [WorklistRow, WorklistRow]

describe('OrderSheet', () => {
  it('shows an error from a failed order but never carries it over to another patient', async () => {
    const user = userEvent.setup()
    const failing = vi.fn<() => Promise<DischargeResult>>(async () => ({
      ok: false,
      reason: 'stale',
      message: 'Ya no está disponible',
    }))
    const { rerender } = render(<OrderSheet row={a} onConfirm={failing} onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: copy.confirm }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya no está disponible')

    rerender(<OrderSheet row={b} onConfirm={failing} onClose={() => {}} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText(copy.description(`${b.bed.label} · ${b.initials}`))).toBeInTheDocument()
  })

  it('confirms and closes; renders nothing without a patient', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { rerender } = render(
      <OrderSheet row={a} onConfirm={async () => ({ ok: true })} onClose={onClose} />,
    )
    await user.click(screen.getByRole('button', { name: copy.confirm }))
    expect(onClose).toHaveBeenCalled()
    rerender(<OrderSheet row={null} onConfirm={async () => ({ ok: true })} onClose={onClose} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('says so when the patient is no longer pending an order', () => {
    render(
      <OrderSheet row={a} unavailable onConfirm={async () => ({ ok: true })} onClose={() => {}} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(copy.gone)
    expect(screen.queryByRole('button', { name: copy.confirm })).not.toBeInTheDocument()
  })
})
