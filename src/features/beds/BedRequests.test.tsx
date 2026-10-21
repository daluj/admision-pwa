import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { Role } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { seedRequests } from '@/test/requestsFixture'
import { renderApp, TEST_USERS } from '@/test/renderApp'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const copy = es.pages.beds
const sheet = copy.assignSheet

async function openCensus(as: Role = 'ADMISSIONS_HEAD') {
  const backend = createMemoryBackend()
  await seedRequests(backend)
  const app = renderApp('/camas', backend, { as })
  await screen.findByRole('list', { name: copy.requests.list })
  return app
}

const rowsOf = () =>
  within(screen.getByRole('list', { name: copy.requests.list })).getAllByRole('listitem')

beforeEach(() => vi.clearAllMocks())

describe('open bed requests on /camas', () => {
  it('lists open requests, urgent first, then longest wait, with counts', async () => {
    await openCensus()
    expect(rowsOf().map((r) => r.getAttribute('data-priority'))).toEqual(['P1', 'P1', 'P2', 'P3'])
    // Same priority: the 3 h wait comes before the 10 min one.
    expect(rowsOf()[0]).toHaveTextContent('I. L. M.')
    expect(rowsOf()[0]).toHaveTextContent(copy.requests.sourceEd(2))
    expect(rowsOf()[0]).toHaveTextContent('3 h')
    expect(rowsOf()[1]).toHaveTextContent(copy.requests.sourceScheduled)
    expect(rowsOf()[2]).toHaveTextContent(copy.requests.isolation)
    expect(rowsOf()[3]).toHaveTextContent('Medicina Interna')
    expect(screen.getByText(copy.requests.counts(4, 1))).toBeInTheDocument()
  })

  it('keeps the text block wide enough to wrap the button underneath on phones', async () => {
    await openCensus()
    expect(rowsOf()[0]!.querySelector('div.flex-1')).toHaveClass('min-w-48')
  })

  it('colours long waits: red after 2 h, amber after 1 h', async () => {
    await openCensus()
    const level = (index: number) =>
      rowsOf()[index]!.querySelector('[data-level]')!.getAttribute('data-level')
    expect(level(0)).toBe('critical') // 3 h
    expect(level(1)).toBe('ok') // 10 min
    expect(level(2)).toBe('warn') // 90 min
  })

  it('applies the unit-type and specialty filters to requests', async () => {
    const user = userEvent.setup()
    await openCensus()
    await user.selectOptions(screen.getByLabelText(copy.filters.specialty), 'MIN')
    expect(rowsOf()).toHaveLength(1)
    expect(rowsOf()[0]).toHaveTextContent('Medicina Interna')
  })

  it.each(['ED_COORDINATOR', 'MANAGEMENT'] as const)(
    '%s sees the list but no action buttons',
    async (role) => {
      await openCensus(role)
      expect(rowsOf()).toHaveLength(4)
      expect(screen.queryByRole('button', { name: copy.requests.assign })).not.toBeInTheDocument()
      expect(screen.queryAllByRole('button', { name: /^Asignar cama/ })).toHaveLength(0)
    },
  )

  it.each(['ADMISSIONS_HEAD', 'BED_MANAGER'] as const)(
    '%s gets an assign button per request',
    async (role) => {
      await openCensus(role)
      expect(screen.getAllByRole('button', { name: /^Asignar cama/ })).toHaveLength(4)
    },
  )

  it('shows an empty state when nothing is waiting', async () => {
    const { backend } = await openCensus()
    const cancelled = await Promise.all(
      ['r-old', 'r-new', 'r-iso', 'r-low'].map(async (id) => ({
        entity: 'bedRequest' as const,
        op: 'put' as const,
        record: {
          ...(await backend.repositories.bedRequest.get(id))!,
          status: 'CANCELLED' as const,
        },
      })),
    )
    await act(() => backend.events.append([], cancelled))
    expect(await screen.findByText(copy.requests.empty)).toBeInTheDocument()
  })
})

describe('assigning a bed', () => {
  it('suggests the longest-free same-specialty bed first, outliers last, isolation only when required', async () => {
    const user = userEvent.setup()
    await openCensus()
    await user.click(screen.getByRole('button', { name: copy.requests.assignFor('I. L. M.') }))
    const dialog = await screen.findByRole('dialog', { name: sheet.title })
    const labels = within(dialog)
      .getAllByRole('radio')
      .map((r) => r.closest('div')!.querySelector('label')!.textContent!.slice(0, 2))
    // A8 free for 2 h, then A3 (30 min); the isolation bed A9 is kept free; M1 is an outlier.
    expect(labels).toEqual(['A8', 'A3', 'M1'])
    expect(within(dialog).getByText(sheet.tags.OUTLIER)).toBeInTheDocument()
  })

  it('offers only isolation beds to a request that needs isolation', async () => {
    const user = userEvent.setup()
    await openCensus()
    const isoRow = rowsOf()[2]!
    await user.click(within(isoRow).getByRole('button', { name: /^Asignar cama/ }))
    const dialog = await screen.findByRole('dialog', { name: sheet.title })
    expect(within(dialog).getAllByRole('radio')).toHaveLength(1)
    expect(within(dialog).getByText(sheet.tags.ISOLATION)).toBeInTheDocument()
  })

  it('reserves the chosen bed as the user: event, toast, request leaves the list, sheet closes', async () => {
    const user = userEvent.setup()
    const { backend } = await openCensus()
    await user.click(screen.getByRole('button', { name: copy.requests.assignFor('I. L. M.') }))
    const dialog = await screen.findByRole('dialog', { name: sheet.title })
    await user.click(within(dialog).getByRole('radio', { name: /A8/ }))
    await user.click(within(dialog).getByRole('button', { name: sheet.reserve }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const events = await backend.events.list()
    expect(events.at(-1)).toMatchObject({
      type: 'BedReserved',
      entityId: 'A8',
      actor: TEST_USERS.ADMISSIONS_HEAD.id,
      payload: { bedRequestId: 'r-old', admissionId: 'ar-old' },
    })
    expect(await backend.repositories.bed.get('A8')).toMatchObject({ status: 'RESERVED' })
    expect(await backend.repositories.bedRequest.get('r-old')).toMatchObject({
      status: 'ASSIGNED',
      assignedBedId: 'A8',
    })
    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith(copy.actions.toast.reserve('A8', 'I. L. M.'))
    await waitFor(() => expect(rowsOf()).toHaveLength(3))
    expect(screen.getByText(copy.requests.counts(3, 2))).toBeInTheDocument()
  })

  it('stays open with an explanation when the simulator assigns the request meanwhile', async () => {
    const user = userEvent.setup()
    const { backend } = await openCensus()
    await user.click(screen.getByRole('button', { name: copy.requests.assignFor('I. L. M.') }))
    const dialog = await screen.findByRole('dialog', { name: sheet.title })
    await user.click(within(dialog).getByRole('radio', { name: /A8/ }))

    const request = (await backend.repositories.bedRequest.get('r-old'))!
    await act(() =>
      backend.events.append(
        [],
        [
          {
            entity: 'bedRequest',
            op: 'put',
            record: { ...request, status: 'ASSIGNED', assignedBedId: 'A8' },
          },
        ],
      ),
    )
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(sheet.gone)
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: sheet.reserve })).not.toBeInTheDocument()
    // Nothing was written by us, and the user can close it.
    expect((await backend.events.list()).filter((e) => e.type === 'BedReserved')).toHaveLength(0)
    await user.click(within(dialog).getByRole('button', { name: sheet.dismiss }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('removes a bed the simulator took from the suggestions and keeps working', async () => {
    const user = userEvent.setup()
    const { backend } = await openCensus()
    await user.click(screen.getByRole('button', { name: copy.requests.assignFor('I. L. M.') }))
    const dialog = await screen.findByRole('dialog', { name: sheet.title })
    await user.click(within(dialog).getByRole('radio', { name: /A8/ }))

    const a8 = (await backend.repositories.bed.get('A8'))!
    await act(() =>
      backend.events.append(
        [],
        [{ entity: 'bed', op: 'put', record: { ...a8, status: 'RESERVED' } }],
      ),
    )
    await waitFor(() =>
      expect(within(dialog).queryByRole('radio', { name: /A8/ })).not.toBeInTheDocument(),
    )
    expect(within(dialog).getByRole('button', { name: sheet.reserve })).toBeDisabled()
    // The user is told why their choice went away.
    expect(within(dialog).getByRole('alert')).toHaveTextContent(sheet.bedTaken)
    await user.click(within(dialog).getByRole('radio', { name: /A3/ }))
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: sheet.reserve })).toBeEnabled()
  })

  it('is operable with the keyboard and closes with Escape', async () => {
    const user = userEvent.setup()
    await openCensus()
    const trigger = screen.getByRole('button', { name: copy.requests.assignFor('I. L. M.') })
    trigger.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: sheet.title })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
