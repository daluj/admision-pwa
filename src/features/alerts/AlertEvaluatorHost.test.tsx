import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import { DEFAULT_ALERT_CONFIG } from '@/domain/alerts'
import { ALERT_NOW, seedAlerts } from '@/test/alertsFixture'
import { AlertEvaluatorHost } from './AlertEvaluatorHost'
import { writeAlertConfig } from './alertConfigStore'

beforeEach(() => localStorage.clear())

async function mount() {
  const backend = createMemoryBackend()
  await seedAlerts(backend)
  const view = render(
    <DataProvider backend={backend}>
      <AlertEvaluatorHost />
    </DataProvider>,
  )
  return { backend, ...view }
}
const open = async (b: Awaited<ReturnType<typeof mount>>['backend']) =>
  (await b.repositories.alert.list()).filter((a) => !a.resolvedAt)

describe('AlertEvaluatorHost', () => {
  it('raises the alerts of the current data as soon as it mounts, stamped with the simulated time', async () => {
    const { backend } = await mount()
    await waitFor(async () => expect((await open(backend)).length).toBeGreaterThanOrEqual(9))
    const alerts = await open(backend)
    expect(alerts.every((a) => a.raisedAt === ALERT_NOW)).toBe(true)
    const events = await backend.events.list()
    expect(
      events.filter((e) => e.type === 'AlertRaised').every((e) => e.actor === 'simulator'),
    ).toBe(true)
  })

  it('uses the saved thresholds', async () => {
    writeAlertConfig({
      ...DEFAULT_ALERT_CONFIG,
      pendingCleaningWarnMin: 90,
      pendingCleaningCriticalMin: 200,
    })
    const { backend } = await mount()
    await waitFor(async () => expect((await open(backend)).length).toBeGreaterThan(0))
    const cleaning = (await open(backend)).filter((a) => a.ruleId === 'BED_PENDING_CLEANING_LONG')
    expect(cleaning.map((a) => a.entityId)).toEqual(['bc3'])
  })

  it('does nothing before the demo is seeded and stops when unmounted', async () => {
    const backend = createMemoryBackend()
    const { unmount } = render(
      <DataProvider backend={backend}>
        <AlertEvaluatorHost />
      </DataProvider>,
    )
    await new Promise((r) => setTimeout(r, 100))
    expect(await backend.events.lastSeq()).toBe(0)
    unmount()
  })
})
