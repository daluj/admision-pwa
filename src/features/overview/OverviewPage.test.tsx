import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { runAlertEvaluation } from '@/domain/commands'
import { DEFAULT_ALERT_CONFIG } from '@/domain/alerts'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import type { Role } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { ALERT_NOW, seedAlerts } from '@/test/alertsFixture'
import { renderApp } from '@/test/renderApp'

const copy = es.pages.overview

async function open(as: Role = 'ADMISSIONS_HEAD', withAlerts = true) {
  const backend = createMemoryBackend()
  await seedAlerts(backend)
  if (withAlerts) {
    await runAlertEvaluation(
      { backend, clock: createFixedClock(ALERT_NOW), newId: () => crypto.randomUUID() },
      DEFAULT_ALERT_CONFIG,
    )
  }
  renderApp('/', backend, { as })
  await screen.findByRole('heading', { level: 2, name: copy.status.title })
  return { backend }
}
const tile = (strip: string, label: string) =>
  within(screen.getByRole('list', { name: strip }))
    .getByText(label)
    .closest('li')!

beforeEach(() => localStorage.clear())

describe('Visión general', () => {
  it('shows the hospital status level with what triggered it', async () => {
    await open()
    const card = screen
      .getByRole('heading', { level: 2, name: copy.status.title })
      .closest('[data-slot="card"]')!
    expect(card).toHaveAttribute('data-level', 'ALERT')
    expect(card).toHaveTextContent(copy.status.levels.ALERT)
    // The longest boarder waited 9 h: over 6 h, not over 12 h.
    expect(
      within(card as HTMLElement).getByText(es.alerts.status.boardingLong('9.0'.replace('.', ','))),
    ).toBeInTheDocument()
  })

  it('has the KPIs of every area, linking to its dashboard', async () => {
    await open()
    const boarding = tile(copy.flow.label, copy.flow.boarding.label)
    expect(boarding).toHaveTextContent('3')
    expect(boarding).toHaveTextContent(copy.flow.boarding.context('9 h'))
    expect(within(boarding).getByRole('link')).toHaveAttribute('href', '/urgencias')
    expect(tile(copy.flow.label, copy.flow.transfers.label)).toHaveTextContent(
      `4${copy.flow.transfers.context(2)}`,
    )
    expect(
      within(tile(copy.flow.label, copy.flow.transfers.label)).getByRole('link'),
    ).toHaveAttribute('href', '/traslados')
    expect(
      within(tile(copy.beds.label, copy.beds.occupancy.label)).getByRole('link'),
    ).toHaveAttribute('href', '/camas')
    expect(tile(copy.beds.label, copy.beds.flow.label)).toHaveTextContent('0 / 0')
    expect(tile(copy.flow.label, copy.flow.alerts.label)).toHaveTextContent(
      copy.flow.alerts.context(9),
    )
  })

  it('lists the open alerts most severe first, linking to their area, with the unacknowledged count', async () => {
    await open()
    const card = screen
      .getByRole('heading', { level: 2, name: copy.alertsCard.title })
      .closest('[data-slot="card"]') as HTMLElement
    const rows = within(card).getAllByRole('listitem')
    expect(rows).toHaveLength(9)
    expect(rows[0]).toHaveAttribute('data-severity', 'CRITICAL')
    const severities = rows.map((r) => r.getAttribute('data-severity'))
    expect([...severities].sort((a, b) => (a === b ? 0 : a === 'CRITICAL' ? -1 : 1))).toEqual(
      severities,
    )
    expect(within(rows[0]!).getByRole('link')).toHaveAttribute('href')
    expect(within(card).queryByText(/más en el centro de alertas/)).not.toBeInTheDocument()
  })

  it('says so when nothing needs attention', async () => {
    await open('ADMISSIONS_HEAD', false)
    expect(screen.getByText(copy.alertsCard.empty)).toBeInTheDocument()
    expect(tile(copy.flow.label, copy.flow.alerts.label)).toHaveTextContent('0')
  })

  it('loads the 24 h trend charts lazily with a table alternative', async () => {
    await open()
    expect(
      await screen.findByRole('figure', { name: es.pages.overview.charts.admitted.title }),
    ).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: es.pages.emergency.chart.title })).toBeInTheDocument()
  })

  it('is available to management, read-only (same page)', async () => {
    await open('MANAGEMENT')
    expect(screen.getByRole('list', { name: copy.beds.label })).toBeInTheDocument()
  })
})
