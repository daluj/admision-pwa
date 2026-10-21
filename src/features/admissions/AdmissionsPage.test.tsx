import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { Role, User } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { seedAdmissions } from '@/test/admissionsFixture'
import { writeSession } from '@/features/auth/sessionStorage'
import { renderApp, TEST_USERS } from '@/test/renderApp'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const copy = es.pages.admissions
const SUPERVISOR_U1: User = {
  ...TEST_USERS.NURSE_SUPERVISOR,
  id: 'usr-sup-u1',
  username: 'sup-u1',
  unitId: 'u1',
}

async function open(as: Role = 'ADMISSIONS_HEAD') {
  const backend = createMemoryBackend()
  await seedAdmissions(backend)
  const app = renderApp('/ingresos-altas', backend, { as })
  await screen.findByRole('list', { name: copy.kpis.label })
  return { ...app }
}

const tile = (label: string) =>
  within(screen.getByRole('list', { name: copy.kpis.label }))
    .getByText(label)
    .closest('li')!

beforeEach(() => vi.clearAllMocks())

describe('Ingresos y altas page (head)', () => {
  it('shows the six KPIs of the fixture', async () => {
    await open()
    expect(tile(copy.kpis.admittedToday.label)).toHaveTextContent(
      `3${copy.kpis.admittedToday.context(1, 2)}`,
    )
    expect(tile(copy.kpis.scheduledPending.label)).toHaveTextContent(
      `2${copy.kpis.scheduledPending.context(2)}`,
    )
    expect(tile(copy.kpis.discharged.label)).toHaveTextContent(
      `3${copy.kpis.discharged.context(5)}`,
    )
    expect(tile(copy.kpis.beforeNoon.label)).toHaveTextContent('67%')
    expect(tile(copy.kpis.beforeNoon.label)).toHaveAttribute('data-status', 'ok')
    expect(tile(copy.kpis.balance.label)).toHaveTextContent('1')
    expect(tile(copy.kpis.balance.label)).toHaveAttribute('data-status', 'ok')
    expect(tile(copy.kpis.cancelledNoBed.label)).toHaveTextContent('1')
    expect(tile(copy.kpis.cancelledNoBed.label)).toHaveAttribute('data-status', 'warn')
  })

  it('lists exceptions, the scheduled admissions, discharges by unit and the balance, in that order', async () => {
    await open()
    expect(
      screen.getByText(/espera cama desde hace 3 h 30 min sobre su hora/).closest('li'),
    ).toHaveAttribute('data-severity', 'critical')
    expect(screen.getByText(/alta ordenada hace 4 h y sigue ingresado/)).toBeInTheDocument()

    const scheduled = screen.getByRole('table', { name: copy.scheduled.title })
    expect(within(scheduled).getAllByRole('row')).toHaveLength(7) // header + 6
    expect(
      within(scheduled).getByText(
        `${copy.scheduled.status.CANCELLED} · ${copy.scheduled.cancelReasons.NO_BED}`,
      ),
    ).toBeInTheDocument()

    const units = screen.getByRole('table', { name: copy.units.title })
    expect(within(units).getByText('Cardiología 5ª Norte')).toBeInTheDocument()
    expect(within(units).getByText(copy.units.total)).toBeInTheDocument()

    const order = [
      screen.getByRole('list', { name: copy.kpis.label }),
      scheduled,
      units,
      screen.getByRole('tablist', { name: copy.worklist.title }),
      screen.getByRole('heading', { level: 2, name: copy.balance.title }),
    ]
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }
  })

  it('shows the balance breakdown and its result', async () => {
    await open()
    const card = screen
      .getByRole('heading', { level: 2, name: copy.balance.title })
      .closest('[data-slot="card"]')!
    expect(
      within(card as HTMLElement).getByText(copy.balance.available).nextElementSibling,
    ).toHaveTextContent('3')
    expect(
      within(card as HTMLElement).getByText(copy.balance.boarding, { exact: false })
        .nextElementSibling,
    ).toHaveTextContent('2')
    expect(within(card as HTMLElement).getByText(copy.balance.ok)).toBeInTheDocument()
  })

  it('updates live: a discharge changes the KPIs and the table', async () => {
    const { backend } = await open()
    const i1 = (await backend.repositories.admission.get('i1'))!
    await act(() =>
      backend.events.append(
        [],
        [
          {
            entity: 'admission',
            op: 'put',
            record: { ...i1, status: 'DISCHARGED', dischargedAt: '2026-10-21T09:59:00.000Z' },
          },
        ],
      ),
    )
    await waitFor(() =>
      expect(tile(copy.kpis.discharged.label)).toHaveTextContent(
        `4${copy.kpis.discharged.context(5)}`,
      ),
    )
  })

  it('has a loading message until the data arrives', async () => {
    renderApp('/ingresos-altas', createMemoryBackend())
    expect(await screen.findByRole('status')).toHaveTextContent(copy.loading)
  })
})

describe('discharge worklist (head)', () => {
  it('has tabs with counts and starts on "previstas hoy", sorted with overdue first', async () => {
    const user = userEvent.setup()
    await open()
    const tabs = screen.getByRole('tablist', { name: copy.worklist.title })
    expect(within(tabs).getByRole('tab', { selected: true })).toHaveTextContent(
      `${copy.worklist.tabs.today} (2)`,
    )
    const panel = screen.getByRole('tabpanel')
    expect(
      within(panel)
        .getAllByRole('row')
        .slice(1)
        .map((r) => r.getAttribute('data-admission')),
    ).toEqual(['i5', 'i1'])
    expect(within(panel).getByText(copy.worklist.overdue)).toBeInTheDocument()

    await user.click(
      within(tabs).getByRole('tab', { name: new RegExp(copy.worklist.tabs.ordered) }),
    )
    expect(
      within(screen.getByRole('tabpanel'))
        .getAllByRole('row')
        .slice(1)
        .map((r) => r.getAttribute('data-admission')),
    ).toEqual(['i2'])
    expect(within(screen.getByRole('tabpanel')).queryByRole('button')).not.toBeInTheDocument() // already ordered
  })

  it('sets an expected discharge from the sheet, as the user', async () => {
    const user = userEvent.setup()
    const { backend } = await open()
    await user.click(
      within(screen.getByRole('tablist')).getByRole('tab', {
        name: new RegExp(copy.worklist.tabs.none),
      }),
    )
    const row = within(screen.getByRole('tabpanel'))
      .getAllByRole('row')
      .find((r) => r.getAttribute('data-admission') === 'i4')!
    await user.click(within(row).getByRole('button', { name: new RegExp(copy.worklist.edit) }))

    const sheet = await screen.findByRole('dialog', { name: copy.expectedSheet.title })
    await user.selectOptions(within(sheet).getByLabelText(copy.expectedSheet.day), '1')
    const time = within(sheet).getByLabelText(copy.expectedSheet.time)
    await user.clear(time)
    await user.type(time, '10:30')
    await user.click(within(sheet).getByRole('button', { name: copy.expectedSheet.save }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await backend.events.list()).at(-1)).toMatchObject({
      type: 'ExpectedDischargeSet',
      entityId: 'i4',
      actor: TEST_USERS.ADMISSIONS_HEAD.id,
      payload: { expectedDischargeAt: '2026-10-22T08:30:00.000Z' },
    })
  })

  it('refuses a time in the past with a message and writes nothing', async () => {
    const user = userEvent.setup()
    const { backend } = await open()
    const seq = await backend.events.lastSeq()
    await user.click(
      screen.getByRole('button', { name: new RegExp(`${copy.worklist.editExisting}: B1`) }),
    )
    const sheet = await screen.findByRole('dialog', { name: copy.expectedSheet.title })
    expect(within(sheet).getByLabelText(copy.expectedSheet.time)).toHaveValue('16:00') // the current value (14:00Z)
    const time = within(sheet).getByLabelText(copy.expectedSheet.time)
    await user.clear(time)
    await user.type(time, '11:00') // now is 12:00 local
    await user.click(within(sheet).getByRole('button', { name: copy.expectedSheet.save }))
    expect(await within(sheet).findByRole('alert')).toHaveTextContent(
      copy.expectedSheet.invalid.past,
    )
    expect(await backend.events.lastSeq()).toBe(seq)
  })

  it('orders a discharge after confirming', async () => {
    const user = userEvent.setup()
    const { backend } = await open()
    await user.click(screen.getByRole('button', { name: new RegExp(`${copy.worklist.order}: B1`) }))
    const sheet = await screen.findByRole('dialog', { name: copy.orderSheet.title })
    expect(within(sheet).getByText(copy.orderSheet.body)).toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: copy.orderSheet.confirm }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await backend.events.list()).at(-1)).toMatchObject({
      type: 'DischargeOrdered',
      entityId: 'i1',
      actor: TEST_USERS.ADMISSIONS_HEAD.id,
    })
    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/^Alta ordenada · B1 · \S/))
  })

  it('explains it when the patient changes state while the sheet is open', async () => {
    const user = userEvent.setup()
    const { backend } = await open()
    await user.click(screen.getByRole('button', { name: new RegExp(`${copy.worklist.order}: B1`) }))
    const sheet = await screen.findByRole('dialog', { name: copy.orderSheet.title })
    const i1 = (await backend.repositories.admission.get('i1'))!
    await act(() =>
      backend.events.append(
        [],
        [
          {
            entity: 'admission',
            op: 'put',
            record: {
              ...i1,
              status: 'DISCHARGE_ORDERED',
              dischargeOrderedAt: '2026-10-21T09:59:00.000Z',
            },
          },
        ],
      ),
    )
    expect(await within(sheet).findByRole('alert')).toHaveTextContent(copy.orderSheet.gone)
    expect(
      within(sheet).queryByRole('button', { name: copy.orderSheet.confirm }),
    ).not.toBeInTheDocument()
  })
})

describe('Ingresos y altas page: roles and scope', () => {
  it.each(['MANAGEMENT', 'BED_MANAGER'] as const)(
    '%s sees everything but has no discharge buttons',
    async (role) => {
      await open(role)
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: new RegExp(copy.worklist.order) }),
      ).not.toBeInTheDocument()
      expect(
        within(screen.getByRole('tabpanel')).getAllByText(copy.worklist.readOnly).length,
      ).toBeGreaterThan(0)
    },
  )

  it('a nurse supervisor sees only their unit and can act only there', async () => {
    const user = userEvent.setup()
    writeSession(SUPERVISOR_U1.id)
    const backend = createMemoryBackend()
    await seedAdmissions(backend)
    await backend.events.append([], [{ entity: 'user', op: 'put', record: SUPERVISOR_U1 }])
    renderApp('/ingresos-altas', backend, { as: null })
    await screen.findByRole('list', { name: copy.kpis.label })

    expect(screen.getByText(copy.scopeNotice('Cardiología 5ª Norte'))).toBeInTheDocument()
    const units = screen.getByRole('table', { name: copy.units.title })
    expect(within(units).getAllByRole('row')).toHaveLength(2) // header + their unit
    expect(within(units).queryByText('Medicina Interna 6ª Norte')).not.toBeInTheDocument()
    // Scheduled admissions of the unit's specialty only (s7 is Medicina Interna).
    const scheduled = screen.getByRole('table', { name: copy.scheduled.title })
    expect(
      within(scheduled)
        .getAllByRole('row')
        .slice(1)
        .map((r) => r.getAttribute('data-admission')),
    ).toEqual(['s2', 's4', 's5', 's3', 's1'])
    // The worklist has their patients only and the buttons work.
    const panel = screen.getByRole('tabpanel')
    expect(
      within(panel)
        .getAllByRole('row')
        .slice(1)
        .map((r) => r.getAttribute('data-admission')),
    ).toEqual(['i1'])
    await user.click(
      within(panel).getByRole('button', { name: new RegExp(`${copy.worklist.order}: B1`) }),
    )
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: copy.orderSheet.confirm,
      }),
    )
    await waitFor(async () =>
      expect((await backend.events.list()).at(-1)).toMatchObject({
        type: 'DischargeOrdered',
        actor: SUPERVISOR_U1.id,
      }),
    )
  })

  it('a nurse supervisor without a unit sees nothing', async () => {
    const orphan: User = {
      ...SUPERVISOR_U1,
      id: 'usr-orphan',
      username: 'orphan',
      unitId: undefined,
    }
    writeSession(orphan.id)
    const backend = createMemoryBackend()
    await seedAdmissions(backend)
    await backend.events.append([], [{ entity: 'user', op: 'put', record: orphan }])
    renderApp('/ingresos-altas', backend, { as: null })
    expect(await screen.findByText(copy.noUnit.title)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: copy.kpis.label })).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('a porter is redirected away', async () => {
    const backend = createMemoryBackend()
    await seedAdmissions(backend)
    const { router } = renderApp('/ingresos-altas', backend, { as: 'PORTER' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/traslados'))
  })
})
