import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BED_STATUS_ACTIONS } from '@/domain/access'
import type { BedView } from '@/domain/kpis'
import { BED_STATUSES, type BedStatus } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { es } from '@/i18n/es'
import type { BedActionResult } from '../useBedActions'
import { BedActionSheet, type BedSheetCommand } from './BedActionSheet'

const copy = es.pages.beds.bedSheet
const NOW = '2026-10-21T10:00:00.000Z'

const view = (status: BedStatus, extra: Partial<BedView> = {}): BedView => ({
  bed: {
    ...sampleEntities.bed,
    label: '512-A',
    status,
    statusChangedAt: '2026-10-21T08:40:00.000Z',
    ...(status === 'BLOCKED' ? { blockedReason: 'Avería' } : {}),
  },
  unit: { ...sampleEntities.unit, name: 'Cardiología 5ª Norte' },
  dischargeOrdered: false,
  outlier: false,
  ...extra,
})

type Perform = (command: BedSheetCommand) => Promise<BedActionResult>
const ok: Perform = async () => ({ ok: true })

function open(
  status: BedStatus,
  options: {
    allowed?: readonly (typeof BED_STATUS_ACTIONS)[BedStatus][number][]
    onPerform?: Perform
    view?: BedView
  } = {},
) {
  const onClose = vi.fn()
  const onPerform = vi.fn<Perform>(options.onPerform ?? ok)
  render(
    <BedActionSheet
      view={options.view ?? view(status)}
      now={NOW}
      allowed={options.allowed ?? BED_STATUS_ACTIONS[status]}
      onPerform={onPerform}
      onClose={onClose}
    />,
  )
  return { onPerform, onClose }
}

const NAMES = {
  startCleaning: copy.startCleaning,
  finishCleaning: copy.finishCleaning,
  unblock: copy.unblock,
  release: copy.release.submit,
  block: copy.block.submit,
}

describe('BedActionSheet: actions by status', () => {
  it.each(BED_STATUSES)('%s shows exactly the actions that fit it', (status) => {
    open(status)
    const dialog = screen.getByRole('dialog', { name: copy.title('512-A') })
    const expected = BED_STATUS_ACTIONS[status].map((a) => NAMES[a as keyof typeof NAMES])
    for (const [action, name] of Object.entries(NAMES)) {
      const present = within(dialog).queryByRole('button', { name }) !== null
      expect(present, `${status} / ${action}`).toBe(expected.includes(name))
    }
    expect(within(dialog).getByText(es.pages.beds.status[status])).toBeInTheDocument()
  })

  it('shows state details: patient initials, stay, discharge, block reason, time waiting', () => {
    open('OCCUPIED', {
      view: view('OCCUPIED', {
        patient: { id: 'p1', initials: 'M. G. R.', fullName: 'María García Ruiz', mrn: 'SIM-1' },
        losMs: 50 * 3_600_000,
        expectedDischargeAt: '2026-10-21T12:00:00.000Z',
      }),
    })
    expect(screen.getByText(copy.patient('M. G. R.'))).toBeInTheDocument()
    expect(screen.getByText(es.pages.beds.unit.stay('2 d 2 h'))).toBeInTheDocument()
    expect(screen.getByText(es.pages.beds.unit.discharge.expected('hoy 14:00'))).toBeInTheDocument()
    // Full identity stays out of the sheet.
    expect(screen.queryByText('María García Ruiz')).not.toBeInTheDocument()
    expect(screen.queryByText('SIM-1')).not.toBeInTheDocument()
  })

  it('explains an occupied bed and a read-only user', () => {
    const { onPerform } = open('OCCUPIED')
    expect(screen.getByText(copy.occupied)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /limpieza|Bloquear|Liberar|Desbloquear/ }),
    ).not.toBeInTheDocument()
    expect(onPerform).not.toHaveBeenCalled()
  })

  it('a user without permission sees the state but no actions', () => {
    open('PENDING_CLEANING', { allowed: [] })
    expect(screen.getByText(copy.readOnly)).toBeInTheDocument()
    expect(screen.getByText(es.pages.beds.status.PENDING_CLEANING)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.startCleaning })).not.toBeInTheDocument()
  })

  it('shows only the permitted subset (nurse: cleaning, no block)', () => {
    open('PENDING_CLEANING', { allowed: ['startCleaning'] })
    expect(screen.getByRole('button', { name: copy.startCleaning })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.block.submit })).not.toBeInTheDocument()
  })
})

describe('BedActionSheet: performing', () => {
  it.each([
    ['PENDING_CLEANING', copy.startCleaning, 'startCleaning'],
    ['CLEANING', copy.finishCleaning, 'finishCleaning'],
    ['BLOCKED', copy.unblock, 'unblock'],
  ] as const)('%s → "%s" runs %s and closes', async (status, label, action) => {
    const user = userEvent.setup()
    const { onPerform, onClose } = open(status)
    await user.click(screen.getByRole('button', { name: label }))
    expect(onPerform).toHaveBeenCalledWith({ action })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('blocking needs a reason: empty is refused with a message, nothing is sent', async () => {
    const user = userEvent.setup()
    const { onPerform } = open('AVAILABLE')
    await user.click(screen.getByRole('button', { name: copy.block.submit }))
    expect(screen.getByText(copy.block.required)).toBeInTheDocument()
    expect(screen.getByLabelText(copy.block.reason)).toBeInvalid()
    await user.type(screen.getByLabelText(copy.block.reason), '   ')
    await user.click(screen.getByRole('button', { name: copy.block.submit }))
    expect(onPerform).not.toHaveBeenCalled()
  })

  it('blocks with a typed reason or a preset', async () => {
    const user = userEvent.setup()
    const { onPerform } = open('AVAILABLE')
    await user.type(screen.getByLabelText(copy.block.reason), '  Fuga de agua ')
    await user.click(screen.getByRole('button', { name: copy.block.submit }))
    expect(onPerform).toHaveBeenLastCalledWith({ action: 'block', reason: 'Fuga de agua' })
  })

  it('a preset fills the reason', async () => {
    const user = userEvent.setup()
    const { onPerform } = open('AVAILABLE')
    await user.selectOptions(screen.getByLabelText(copy.block.presets), copy.blockReasons[1]!)
    expect(screen.getByLabelText(copy.block.reason)).toHaveValue(copy.blockReasons[1])
    await user.click(screen.getByRole('button', { name: copy.block.submit }))
    expect(onPerform).toHaveBeenCalledWith({ action: 'block', reason: copy.blockReasons[1] })
  })

  it('a block can also be started from a bed waiting for cleaning', () => {
    open('PENDING_CLEANING')
    expect(screen.getByRole('button', { name: copy.block.submit })).toBeInTheDocument()
  })

  it('releasing a reservation: the reason is optional', async () => {
    const user = userEvent.setup()
    const { onPerform } = open('RESERVED')
    await user.click(screen.getByRole('button', { name: copy.release.submit }))
    expect(onPerform).toHaveBeenLastCalledWith({ action: 'release' })

    await user.type(screen.getByLabelText(copy.release.reason), 'Cambio de unidad')
    await user.click(screen.getByRole('button', { name: copy.release.submit }))
    expect(onPerform).toHaveBeenLastCalledWith({ action: 'release', reason: 'Cambio de unidad' })
  })

  it('keeps the sheet open and shows why when the action fails', async () => {
    const user = userEvent.setup()
    const message = es.pages.beds.actions.errors.stale
    const { onClose } = open('PENDING_CLEANING', {
      onPerform: async () => ({ ok: false, reason: 'stale', message }),
    })
    await user.click(screen.getByRole('button', { name: copy.startCleaning }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('resets when the bed changes state or reservation under it (no stale form survives)', async () => {
    const user = userEvent.setup()
    const reservedFor = (admissionId: string) => {
      const v = view('RESERVED')
      return { ...v, bed: { ...v.bed, admissionId } }
    }
    const { rerender } = render(
      <BedActionSheet
        view={reservedFor('adm-1')}
        now={NOW}
        allowed={['release']}
        onPerform={ok}
        onClose={() => {}}
      />,
    )
    await user.type(screen.getByLabelText(copy.release.reason), 'Cambio de unidad')
    expect(screen.getByLabelText(copy.release.reason)).toHaveValue('Cambio de unidad')

    // The simulator re-reserved the bed for someone else.
    rerender(
      <BedActionSheet
        view={reservedFor('adm-2')}
        now={NOW}
        allowed={['release']}
        onPerform={ok}
        onClose={() => {}}
      />,
    )
    expect(screen.getByLabelText(copy.release.reason)).toHaveValue('')
  })

  it('disables the actions while busy and renders nothing without a bed', () => {
    const { rerender } = render(
      <BedActionSheet
        view={view('CLEANING')}
        now={NOW}
        allowed={['finishCleaning']}
        onPerform={ok}
        onClose={() => {}}
        busy
      />,
    )
    expect(screen.getByRole('button', { name: copy.finishCleaning })).toBeDisabled()
    rerender(
      <BedActionSheet view={null} now={NOW} allowed={[]} onPerform={ok} onClose={() => {}} />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
