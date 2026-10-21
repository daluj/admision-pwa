import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { es } from '@/i18n/es'
import { NewTransferSheet, type InpatientOption } from './NewTransferSheet'

const copy = es.pages.transfers.newSheet
const OPTIONS: InpatientOption[] = [
  { patientId: 'p1', bedId: 'b1', label: 'Planta 1 101 · M. G.', fromLabel: 'Planta 1 101' },
  { patientId: 'p2', bedId: 'b2', label: 'Planta 1 102 · L. R.', fromLabel: 'Planta 1 102' },
]

function setup(onConfirm = vi.fn().mockResolvedValue({ ok: true })) {
  const onClose = vi.fn()
  render(<NewTransferSheet open options={OPTIONS} onConfirm={onConfirm} onClose={onClose} />)
  return { onConfirm, onClose }
}

describe('NewTransferSheet', () => {
  it('requires a patient', async () => {
    const { onConfirm } = setup()
    await userEvent.click(screen.getByRole('button', { name: copy.confirm }))
    expect(screen.getByRole('alert')).toHaveTextContent(copy.required)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('requests a transfer from the patient bed with the destination default reason', async () => {
    const user = userEvent.setup()
    const { onConfirm, onClose } = setup()
    const sheet = screen.getByRole('dialog', { name: copy.title })
    await user.selectOptions(within(sheet).getByLabelText(copy.patient), 'b2')
    await user.selectOptions(within(sheet).getByLabelText(copy.destination), 'OR')
    expect(within(sheet).getByLabelText(copy.reason)).toHaveValue('SURGERY')
    await user.selectOptions(within(sheet).getByLabelText(copy.priority), 'URGENT')
    await user.click(within(sheet).getByRole('button', { name: copy.confirm }))

    expect(onConfirm).toHaveBeenCalledWith(
      {
        patientId: 'p2',
        fromLocation: { kind: 'BED', refId: 'b2', label: 'Planta 1 102' },
        toLocation: { kind: 'OR', label: 'Quirófano' },
        reason: 'SURGERY',
        priority: 'URGENT',
      },
      'L. R. → Quirófano',
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('shows the error and stays open when the request fails', async () => {
    const user = userEvent.setup()
    const { onClose } = setup(
      vi.fn().mockResolvedValue({ ok: false, reason: 'failed', message: 'Fallo' }),
    )
    await user.selectOptions(screen.getByLabelText(copy.patient), 'b1')
    await user.click(screen.getByRole('button', { name: copy.confirm }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Fallo')
    expect(onClose).not.toHaveBeenCalled()
  })
})
