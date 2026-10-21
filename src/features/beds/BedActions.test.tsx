import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { Bed, Role } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { es } from '@/i18n/es'
import { seedCensus } from '@/test/censusFixture'
import { renderApp, TEST_UNIT, TEST_USERS } from '@/test/renderApp'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const copy = es.pages.beds
const sheet = copy.bedSheet
const NOW = '2026-10-21T10:00:00.000Z'

async function openUnit(code = 'CAR-5N', as: Role = 'ADMISSIONS_HEAD', extraBeds: Bed[] = []) {
  const backend = createMemoryBackend()
  await seedCensus(backend)
  if (extraBeds.length) {
    await backend.events.append(
      [],
      extraBeds.map((record) => ({ entity: 'bed' as const, op: 'put' as const, record })),
    )
  }
  const app = renderApp(`/camas/${code}`, backend, { as })
  await screen.findByRole('region', { name: copy.unit.mapTitle })
  return app
}

const tile = (label: string) =>
  within(screen.getByRole('region', { name: copy.unit.mapTitle }))
    .getByText(label, { selector: 'span' })
    .closest('button')!

const dialog = () => screen.findByRole('dialog', { name: /^Cama / })
const lastEvent = async (backend: Awaited<ReturnType<typeof openUnit>>['backend']) =>
  (await backend.events.list()).at(-1)

beforeEach(() => vi.clearAllMocks())

describe('bed actions from the bed map (head of admissions)', () => {
  it('blocks a free bed with a reason, as the user', async () => {
    const user = userEvent.setup()
    const { backend } = await openUnit()
    await user.click(tile('A3'))
    const d = await dialog()
    await user.type(within(d).getByLabelText(sheet.block.reason), 'Fuga de agua')
    await user.click(within(d).getByRole('button', { name: sheet.block.submit }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await lastEvent(backend)).toMatchObject({
      type: 'BedBlocked',
      entityId: 'A3',
      actor: TEST_USERS.ADMISSIONS_HEAD.id,
      payload: { reason: 'Fuga de agua' },
    })
    expect(await backend.repositories.bed.get('A3')).toMatchObject({
      status: 'BLOCKED',
      blockedReason: 'Fuga de agua',
    })
    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith(copy.actions.toast.block('A3'))
    // The tile updates live.
    await waitFor(() => expect(tile('A3')).toHaveAttribute('data-status', 'BLOCKED'))
  })

  it('unblocks, starts and finishes cleaning, and releases a reservation', async () => {
    const user = userEvent.setup()
    const { backend } = await openUnit()

    await user.click(tile('A6'))
    await user.click(within(await dialog()).getByRole('button', { name: sheet.unblock }))
    await waitFor(async () =>
      expect(await lastEvent(backend)).toMatchObject({ type: 'BedUnblocked', entityId: 'A6' }),
    )

    await user.click(tile('A4'))
    await user.click(within(await dialog()).getByRole('button', { name: sheet.startCleaning }))
    await waitFor(async () =>
      expect(await lastEvent(backend)).toMatchObject({
        type: 'BedCleaningStarted',
        entityId: 'A4',
      }),
    )

    await user.click(tile('A5'))
    await user.click(within(await dialog()).getByRole('button', { name: sheet.finishCleaning }))
    await waitFor(async () =>
      expect(await lastEvent(backend)).toMatchObject({
        type: 'BedCleaningFinished',
        entityId: 'A5',
      }),
    )
    expect(await backend.repositories.bed.get('A5')).toMatchObject({ status: 'AVAILABLE' })
  })

  it('releases a reservation, leaving the bed free and the request open again', async () => {
    const user = userEvent.setup()
    const { backend } = await openUnit()
    await user.click(tile('A7'))
    const d = await dialog()
    await user.type(within(d).getByLabelText(sheet.release.reason), 'Cambio de unidad')
    await user.click(within(d).getByRole('button', { name: sheet.release.submit }))
    await waitFor(async () =>
      expect(
        (await backend.events.list()).some(
          (e) => e.type === 'BedReservationReleased' && e.actor === TEST_USERS.ADMISSIONS_HEAD.id,
        ),
      ).toBe(true),
    )
    expect(await backend.repositories.bed.get('A7')).toMatchObject({ status: 'AVAILABLE' })
  })

  it('an occupied bed opens an information-only sheet', async () => {
    const user = userEvent.setup()
    const { backend } = await openUnit()
    await user.click(tile('A1'))
    const d = await dialog()
    expect(within(d).getByText(sheet.occupied)).toBeInTheDocument()
    expect(within(d).getByText(sheet.patient('M. G. R.'))).toBeInTheDocument()
    expect(
      within(d).queryByRole('button', { name: /Bloquear|limpieza|Liberar|Desbloquear/ }),
    ).not.toBeInTheDocument()
    expect(await backend.events.lastSeq()).toBe(0)
  })

  it('the sheet follows the bed live: a bed that changes while open shows its new actions', async () => {
    const user = userEvent.setup()
    const { backend } = await openUnit()
    await user.click(tile('A4'))
    const d = await dialog()
    expect(within(d).getByRole('button', { name: sheet.startCleaning })).toBeInTheDocument()

    const a4 = (await backend.repositories.bed.get('A4'))!
    await act(() =>
      backend.events.append(
        [],
        [{ entity: 'bed', op: 'put', record: { ...a4, status: 'CLEANING' } }],
      ),
    )
    await waitFor(() =>
      expect(within(d).getByRole('button', { name: sheet.finishCleaning })).toBeInTheDocument(),
    )
    expect(within(d).queryByRole('button', { name: sheet.startCleaning })).not.toBeInTheDocument()
  })

  it('opens with the keyboard, closes with Escape and returns focus to the tile', async () => {
    const user = userEvent.setup()
    await openUnit()
    const a3 = tile('A3')
    a3.focus()
    await user.keyboard('{Enter}')
    const d = await dialog()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(d).not.toBeInTheDocument())
    await waitFor(() => expect(a3).toHaveFocus())
  })
})

describe('who can act', () => {
  it.each(['ED_COORDINATOR', 'MANAGEMENT'] as const)(
    '%s sees every bed but no action buttons',
    async (role) => {
      const user = userEvent.setup()
      const { backend } = await openUnit('CAR-5N', role)
      for (const label of ['A3', 'A4', 'A5', 'A6', 'A7']) {
        await user.click(tile(label))
        const d = await dialog()
        expect(within(d).getByText(sheet.readOnly)).toBeInTheDocument()
        expect(
          within(d).queryByRole('button', { name: /Bloquear|limpieza|Liberar|Desbloquear/ }),
        ).not.toBeInTheDocument()
        await user.keyboard('{Escape}')
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      }
      expect(await backend.events.lastSeq()).toBe(0)
    },
  )

  it('a bed manager can act like the head', async () => {
    const user = userEvent.setup()
    await openUnit('CAR-5N', 'BED_MANAGER')
    await user.click(tile('A3'))
    expect(
      within(await dialog()).getByRole('button', { name: sheet.block.submit }),
    ).toBeInTheDocument()
  })

  describe('a nurse supervisor in their own unit', () => {
    const own = (id: string, status: Bed['status']): Bed => ({
      ...sampleEntities.bed,
      id,
      unitId: TEST_UNIT.id,
      label: id,
      status,
      statusChangedAt: NOW,
    })
    const beds = [
      own('T1', 'PENDING_CLEANING'),
      own('T2', 'CLEANING'),
      own('T3', 'AVAILABLE'),
      own('T4', 'BLOCKED'),
    ]

    it('can start and finish cleaning, and nothing else', async () => {
      const user = userEvent.setup()
      const { backend } = await openUnit(TEST_UNIT.code, 'NURSE_SUPERVISOR', beds)

      await user.click(tile('T1'))
      let d = await dialog()
      expect(within(d).queryByRole('button', { name: sheet.block.submit })).not.toBeInTheDocument()
      await user.click(within(d).getByRole('button', { name: sheet.startCleaning }))
      await waitFor(async () =>
        expect(await lastEvent(backend)).toMatchObject({
          type: 'BedCleaningStarted',
          actor: TEST_USERS.NURSE_SUPERVISOR.id,
        }),
      )

      await user.click(tile('T2'))
      d = await dialog()
      expect(within(d).getByRole('button', { name: sheet.finishCleaning })).toBeInTheDocument()
      expect(within(d).queryByRole('button', { name: sheet.block.submit })).not.toBeInTheDocument()
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      for (const label of ['T3', 'T4']) {
        await user.click(tile(label))
        const sheetEl = await dialog()
        expect(within(sheetEl).getByText(sheet.readOnly)).toBeInTheDocument()
        await user.keyboard('{Escape}')
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      }
    })
  })
})
