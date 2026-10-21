import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { Role, User } from '@/domain/schemas'
import { writeSession } from '@/features/auth/sessionStorage'
import { es } from '@/i18n/es'
import { renderApp, TEST_USERS } from '@/test/renderApp'
import { seedTransfers } from '@/test/transfersFixture'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const copy = es.pages.transfers
const PORTER_A: User = { ...TEST_USERS.PORTER, id: 'usr-pa', username: 'pa', porterId: 'por-a' }
const PORTER_C: User = { ...TEST_USERS.PORTER, id: 'usr-pc', username: 'pc', porterId: 'por-c' }

async function open(as: Role | User = 'ADMISSIONS_HEAD') {
  const backend = createMemoryBackend()
  await seedTransfers(backend)
  if (typeof as === 'string') {
    renderApp('/traslados', backend, { as })
  } else {
    await backend.events.append([], [{ entity: 'user', op: 'put', record: as }])
    writeSession(as.id)
    renderApp('/traslados', backend, { as: null })
  }
  await screen.findByRole('heading', { level: 1 })
  return { backend }
}

const tile = (label: string) =>
  within(screen.getByRole('list', { name: copy.kpis.label }))
    .getByText(label)
    .closest('li')!
const queueRow = (id: string) => document.querySelector(`tr[data-transfer="${id}"]`) as HTMLElement

beforeEach(() => vi.clearAllMocks())

describe('Traslados: dispatch board', () => {
  it('shows the six KPIs of the fixture', async () => {
    await open()
    await screen.findByRole('list', { name: copy.kpis.label })
    expect(tile(copy.kpis.open.label)).toHaveTextContent(`4${copy.kpis.open.context(2, 1, 1)}`)
    expect(tile(copy.kpis.unassigned.label)).toHaveAttribute('data-status', 'warn') // 12 min
    expect(tile(copy.kpis.sla.label)).toHaveTextContent('75%')
    expect(tile(copy.kpis.sla.label)).toHaveAttribute('data-status', 'warn')
    expect(tile(copy.kpis.porters.label)).toHaveTextContent(`2${copy.kpis.porters.context(2, 1)}`)
    expect(tile(copy.kpis.done.label)).toHaveTextContent('3')
  })

  it('lists the queue urgent first, with the SLA as text and the overdue one flagged', async () => {
    await open()
    const table = await screen.findByRole('table', { name: copy.queue.title })
    const ids = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((r) => r.getAttribute('data-transfer'))
    expect(ids).toEqual(['t1', 't3', 't4', 't2'])
    expect(queueRow('t1')).toHaveTextContent(copy.queue.slaLate('2 min'))
    expect(queueRow('t1').querySelector('[data-overdue="true"]')).not.toBeNull()
    expect(queueRow('t3')).toHaveTextContent(copy.queue.slaIn('3 min'))
    expect(queueRow('t4')).toHaveTextContent(copy.queue.slaDone)
    expect(screen.getByText(/sin recoger, vencido hace 2 min/)).toBeInTheDocument()
  })

  it('lists on-duty porters with their job and counts those off shift', async () => {
    await open()
    const list = await screen.findByRole('list', { name: copy.portersPanel.title })
    expect(within(list).getAllByRole('listitem')).toHaveLength(4)
    expect(within(list).getByText('Carla Celadora').closest('li')).toHaveTextContent(
      copy.portersPanel.busy,
    )
    expect(screen.getByText(copy.portersPanel.offShift(1))).toBeInTheDocument()
  })

  it('assigns the suggested available porter from the sheet', async () => {
    const user = userEvent.setup()
    const { backend } = await open()
    await screen.findByRole('table', { name: copy.queue.title })
    await user.click(within(queueRow('t2')).getByRole('button', { name: /^Asignar:/ }))

    const sheet = await screen.findByRole('dialog', { name: copy.assignSheet.title })
    // Both free porters are offered, the one free the longest (never delivered → first) suggested.
    expect(within(sheet).getAllByRole('radio')).toHaveLength(2)
    await user.click(within(sheet).getByRole('button', { name: copy.assignSheet.confirm }))

    await waitFor(async () =>
      expect(await backend.repositories.transferRequest.get('t2')).toMatchObject({
        status: 'ASSIGNED',
        porterId: 'por-b',
      }),
    )
    expect((await backend.events.list()).at(-1)).toMatchObject({
      type: 'TransferAssigned',
      actor: TEST_USERS.ADMISSIONS_HEAD.id,
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('cancels a transfer with a reason', async () => {
    const user = userEvent.setup()
    const { backend } = await open()
    await screen.findByRole('table', { name: copy.queue.title })
    await user.click(within(queueRow('t3')).getByRole('button', { name: /^Cancelar:/ }))
    const sheet = await screen.findByRole('dialog', { name: copy.cancelSheet.title })
    await user.type(within(sheet).getByLabelText(copy.cancelSheet.reasonLabel), 'Paciente de alta')
    await user.click(within(sheet).getByRole('button', { name: copy.cancelSheet.confirm }))

    await waitFor(async () =>
      expect((await backend.repositories.transferRequest.get('t3'))!.status).toBe('CANCELLED'),
    )
    expect((await backend.events.list()).at(-1)).toMatchObject({
      type: 'TransferCancelled',
      payload: { reason: 'Paciente de alta' },
    })
  })

  it('has no cancel action once the patient is on the way', async () => {
    await open()
    await screen.findByRole('table', { name: copy.queue.title })
    expect(within(queueRow('t4')).queryByRole('button')).not.toBeInTheDocument()
    expect(
      within(queueRow('t3')).queryByRole('button', { name: /^Asignar/ }),
    ).not.toBeInTheDocument()
  })

  it('explains when the transfer changed under an open sheet', async () => {
    const user = userEvent.setup()
    const { backend } = await open()
    await screen.findByRole('table', { name: copy.queue.title })
    await user.click(within(queueRow('t2')).getByRole('button', { name: /^Asignar:/ }))
    await screen.findByRole('dialog', { name: copy.assignSheet.title })
    const t2 = (await backend.repositories.transferRequest.get('t2'))!
    await backend.events.append(
      [],
      [{ entity: 'transferRequest', op: 'put', record: { ...t2, status: 'CANCELLED' } }],
    )
    expect(await screen.findByText(copy.assignSheet.gone)).toBeInTheDocument()
  })

  it('management sees the board read-only', async () => {
    await open('MANAGEMENT')
    await screen.findByRole('table', { name: copy.queue.title })
    expect(screen.queryByRole('button', { name: copy.queue.newTransfer })).not.toBeInTheDocument()
    expect(within(queueRow('t2')).getByText(copy.queue.readOnly)).toBeInTheDocument()
  })

  it('opens the new-transfer sheet for the head', async () => {
    const user = userEvent.setup()
    await open()
    await user.click(await screen.findByRole('button', { name: copy.queue.newTransfer }))
    const sheet = await screen.findByRole('dialog', { name: copy.newSheet.title })
    expect(within(sheet).getByText(copy.newSheet.noPatients)).toBeInTheDocument() // fixture has no inpatients
  })
})

describe('Traslados: Mi cola (porter)', () => {
  it('shows my job with the next step and walks it to the end', async () => {
    const user = userEvent.setup()
    const { backend } = await open(PORTER_C)
    const work = await screen.findByRole('list', { name: copy.myQueue.work })
    expect(within(work).getAllByRole('listitem')).toHaveLength(1)
    await user.click(
      within(work).getByRole('button', { name: new RegExp(`^${copy.myQueue.pickUp}`) }),
    )
    await waitFor(async () =>
      expect((await backend.repositories.transferRequest.get('t3'))!.status).toBe('PICKED_UP'),
    )
    await user.click(
      await within(work).findByRole('button', { name: new RegExp(`^${copy.myQueue.deliver}`) }),
    )
    await waitFor(async () =>
      expect((await backend.repositories.transferRequest.get('t3'))!.status).toBe('DELIVERED'),
    )
    expect((await backend.repositories.porter.get('por-c'))!.status).toBe('AVAILABLE')
  })

  it('accepts an open transfer while available; a busy porter cannot', async () => {
    const user = userEvent.setup()
    const { backend } = await open(PORTER_A)
    const list = await screen.findByRole('list', { name: copy.myQueue.open })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText(copy.myQueue.doneToday(2))).toBeInTheDocument()
    await user.click(within(list).getAllByRole('button', { name: /^Aceptar/ })[0]!)
    await waitFor(async () =>
      expect(await backend.repositories.transferRequest.get('t1')).toMatchObject({
        status: 'ASSIGNED',
        porterId: 'por-a',
      }),
    )
    // por-a is BUSY now: the remaining accept buttons are disabled.
    await waitFor(() =>
      expect(within(list).getAllByRole('button', { name: /^Aceptar/ })[0]).toBeDisabled(),
    )
  })

  it('tells a porter login without a linked porter to ask for one', async () => {
    await open('PORTER')
    expect(await screen.findByText(copy.myQueue.noPorter.title)).toBeInTheDocument()
  })
})
