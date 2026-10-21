import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { Alert, Role, User } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { writeSession } from '@/features/auth/sessionStorage'
import { es } from '@/i18n/es'
import { ALERT_NOW } from '@/test/alertsFixture'
import { renderApp, TEST_USERS } from '@/test/renderApp'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const copy = es.alerts.centre
const ago = (m: number) => new Date(Date.parse(ALERT_NOW) - m * 60_000).toISOString()

const alert = (id: string, extra: Partial<Alert>): Alert => ({
  ...sampleEntities.alert,
  id,
  ruleId: 'TRANSFER_SLA_BREACH',
  severity: 'WARNING',
  entityType: 'TransferRequest',
  entityId: `e-${id}`,
  message: 'x',
  raisedAt: ago(30),
  ...extra,
})
const ALERTS: Alert[] = [
  alert('crit', {
    severity: 'CRITICAL',
    raisedAt: ago(10),
    params: { initials: 'M. G.', to: 'Radiología' },
  }),
  alert('clean', {
    ruleId: 'BED_PENDING_CLEANING_LONG',
    entityType: 'Bed',
    params: { bedLabel: 'B1', unitName: 'Cardiología 5ª Norte', unitId: 'u1' },
  }),
  alert('board', {
    ruleId: 'BOARDING_LONG',
    entityType: 'EdVisit',
    params: { initials: 'L. R.' },
    acknowledgedAt: ago(5),
    acknowledgedBy: TEST_USERS.ADMISSIONS_HEAD.id,
  }),
  alert('done', {
    ruleId: 'BOARDING_LONG',
    entityType: 'EdVisit',
    params: { initials: 'P. S.' },
    resolvedAt: ago(2),
  }),
]
const SUPERVISOR: User = {
  ...TEST_USERS.NURSE_SUPERVISOR,
  id: 'usr-sup',
  username: 'sup',
  unitId: 'u1',
}

async function open(as: Role | User = 'ADMISSIONS_HEAD') {
  const backend = createMemoryBackend()
  await backend.events.append(
    [],
    [
      {
        entity: 'simulationState',
        op: 'put',
        record: { ...sampleEntities.simulationState, simNow: ALERT_NOW },
      },
      ...ALERTS.map((record) => ({ entity: 'alert' as const, op: 'put' as const, record })),
    ],
  )
  if (typeof as === 'string') {
    renderApp('/camas', backend, { as })
  } else {
    await backend.events.append([], [{ entity: 'user', op: 'put', record: as }])
    writeSession(as.id)
    renderApp('/camas', backend, { as: null })
  }
  await screen.findByRole('button', { name: new RegExp(`^${es.topBar.alerts.label}`) })
  return { backend }
}
// `hidden`: while the centre (a modal sheet) is open the rest of the page is aria-hidden.
const bell = () =>
  screen.getByRole('button', { name: new RegExp(`^${es.topBar.alerts.label}`), hidden: true })
const openCentre = async () => {
  await userEvent.click(bell())
  return screen.findByRole('dialog', { name: copy.title })
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('alert bell', () => {
  it('counts unacknowledged open alerts, coloured by the worst, with the same text in its name', async () => {
    await open()
    await waitFor(() => expect(bell()).toHaveAccessibleName(/2 alertas sin reconocer \(crítica\)/))
    expect(bell().querySelector('[data-severity="CRITICAL"]')).toHaveTextContent('2')
  })

  it('shows 0 and the empty text when the user sees no alert (a supervisor of another unit)', async () => {
    await open({ ...SUPERVISOR, id: 'usr-sup9', username: 'sup9', unitId: 'u9' })
    expect(
      await screen.findByRole('button', {
        name: `${es.topBar.alerts.label}: ${es.topBar.alerts.empty}`,
      }),
    ).toBeInTheDocument()
  })
})

describe('alert centre', () => {
  it('lists open alerts, most severe first, with Spanish text, age and area', async () => {
    await open()
    const centre = await openCentre()
    const list = within(centre).getByRole('list', { name: copy.open })
    const rows = within(list).getAllByRole('listitem')
    expect(rows.map((r) => r.getAttribute('data-alert'))).toEqual(['crit', 'board', 'clean'])
    expect(rows[0]).toHaveTextContent(
      es.alerts.rules.TRANSFER_SLA_BREACH({ initials: 'M. G.', to: 'Radiología' }),
    )
    expect(rows[0]).toHaveTextContent(copy.severities.CRITICAL)
    expect(rows[0]).toHaveTextContent(copy.since('10 min'))
    expect(rows[0]).toHaveTextContent(copy.areas.transfers)
    expect(rows[1]).toHaveTextContent(
      copy.acknowledged(TEST_USERS.ADMISSIONS_HEAD.displayName, 'hoy 11:55'),
    )
    expect(
      within(rows[1]!).queryByRole('button', { name: new RegExp(copy.acknowledge) }),
    ).not.toBeInTheDocument()
    const resolved = within(centre).getByRole('list', { name: copy.resolved })
    expect(within(resolved).getAllByRole('listitem')).toHaveLength(1)
  })

  it('filters by severity and by area', async () => {
    const user = userEvent.setup()
    await open()
    const centre = await openCentre()
    const rows = () => within(centre).getByRole('list', { name: copy.open }).querySelectorAll('li')
    await user.selectOptions(within(centre).getByLabelText(copy.severity), 'CRITICAL')
    expect([...rows()].map((r) => r.getAttribute('data-alert'))).toEqual(['crit'])
    await user.selectOptions(within(centre).getByLabelText(copy.severity), '')
    await user.selectOptions(within(centre).getByLabelText(copy.area), 'beds')
    expect([...rows()].map((r) => r.getAttribute('data-alert'))).toEqual(['clean'])
    await user.selectOptions(within(centre).getByLabelText(copy.area), 'admissions')
    expect(within(centre).getByText(copy.emptyFiltered)).toBeInTheDocument()
  })

  it('acknowledges an alert as the user: event, stamp, count goes down', async () => {
    const user = userEvent.setup()
    const { backend } = await open()
    const centre = await openCentre()
    await user.click(
      within(centre).getByRole('button', { name: new RegExp(`^Reconocer alerta: .*Radiología`) }),
    )
    await waitFor(async () =>
      expect(await backend.repositories.alert.get('crit')).toMatchObject({
        acknowledgedBy: TEST_USERS.ADMISSIONS_HEAD.id,
      }),
    )
    expect((await backend.events.list()).at(-1)).toMatchObject({
      type: 'AlertAcknowledged',
      actor: TEST_USERS.ADMISSIONS_HEAD.id,
    })
    await waitFor(() => expect(bell()).toHaveAccessibleName(/1 alerta sin reconocer \(aviso\)/))
  })

  it('porters see only the alerts of their area and cannot acknowledge', async () => {
    await open('PORTER')
    const centre = await openCentre()
    const rows = within(centre).getByRole('list', { name: copy.open }).querySelectorAll('li')
    expect([...rows].map((r) => r.getAttribute('data-alert'))).toEqual(['crit'])
    expect(
      within(centre).queryByRole('button', { name: new RegExp(copy.acknowledge) }),
    ).not.toBeInTheDocument()
  })

  it('a nurse supervisor only sees their own unit and may acknowledge it', async () => {
    await open(SUPERVISOR)
    const centre = await openCentre()
    const rows = within(centre).getByRole('list', { name: copy.open }).querySelectorAll('li')
    expect([...rows].map((r) => r.getAttribute('data-alert'))).toEqual(['clean'])
    expect(
      within(centre).getByRole('button', { name: new RegExp(copy.acknowledge) }),
    ).toBeInTheDocument()
  })

  it('an alert link goes to its area and closes the centre', async () => {
    const user = userEvent.setup()
    await open()
    const centre = await openCentre()
    await user.click(
      within(centre).getAllByRole('link', { name: copy.goTo(copy.areas.transfers) })[0]!,
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: es.pages.transfers.title }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: copy.title })).not.toBeInTheDocument(),
    )
  })
})
