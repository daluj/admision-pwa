import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_ALERT_CONFIG } from '@/domain/alerts'
import { createCommandHarness, type CommandHarness } from '@/test/commandHarness'
import { ALERT_NOW, seedAlerts } from '@/test/alertsFixture'
import { acknowledgeAlert, evaluateAlerts, NoAlertChangesError, runAlertEvaluation } from './alerts'
import { InvalidCommandError } from './types'

let h: CommandHarness
const types = async (since = 0) =>
  (await h.backend.events.list()).filter((e) => e.seq > since).map((e) => e.type)
const open = async () => (await h.backend.repositories.alert.list()).filter((a) => !a.resolvedAt)

beforeEach(async () => {
  h = createCommandHarness({ start: ALERT_NOW })
  await seedAlerts(h.backend)
})

describe('evaluateAlerts', () => {
  it('raises one alert per problem, atomically, as the engine', async () => {
    const events = await h.run(evaluateAlerts, { config: DEFAULT_ALERT_CONFIG })
    expect(events.every((e) => e.type === 'AlertRaised' && e.actor === 'simulator')).toBe(true)
    const alerts = await open()
    // 3 triage + 2 boarding + 2 cleaning + 1 transfer + 1 unit full + balance (if negative)
    expect(alerts.filter((a) => a.ruleId !== 'BED_BALANCE_NEGATIVE')).toHaveLength(9)
    expect(events).toHaveLength(alerts.length)
    const bc3 = alerts.find((a) => a.entityId === 'bc3')!
    expect(bc3).toMatchObject({
      ruleId: 'BED_PENDING_CLEANING_LONG',
      severity: 'CRITICAL',
      raisedAt: ALERT_NOW,
      params: { bedLabel: 'BC3', unitId: 'u1' },
    })
  })

  it('is a no-op the second time (nothing written)', async () => {
    await h.run(evaluateAlerts, { config: DEFAULT_ALERT_CONFIG })
    const seq = await h.backend.events.lastSeq()
    await expect(h.run(evaluateAlerts, { config: DEFAULT_ALERT_CONFIG })).rejects.toBeInstanceOf(
      NoAlertChangesError,
    )
    expect(await h.backend.events.lastSeq()).toBe(seq)
    await expect(runAlertEvaluation(h.deps, DEFAULT_ALERT_CONFIG)).resolves.toEqual({
      raised: 0,
      resolved: 0,
    })
  })

  it('resolves an alert when its problem is over, keeping it as history', async () => {
    await h.run(evaluateAlerts, { config: DEFAULT_ALERT_CONFIG })
    const before = await h.backend.events.lastSeq()
    const bed = (await h.backend.repositories.bed.get('bc3'))!
    await h.backend.events.append(
      [],
      [{ entity: 'bed', op: 'put', record: { ...bed, status: 'CLEANING' } }],
    )
    const result = await runAlertEvaluation(h.deps, DEFAULT_ALERT_CONFIG)
    expect(result).toEqual({ raised: 0, resolved: 1 })
    expect((await types(before)).filter((t) => t === 'AlertResolved')).toHaveLength(1)
    const all = await h.backend.repositories.alert.list()
    const old = all.find((a) => a.entityId === 'bc3')!
    expect(old.resolvedAt).toBeDefined()
    expect((await open()).find((a) => a.entityId === 'bc3')).toBeUndefined()
  })

  it('an escalation resolves the old alert and raises a new one', async () => {
    await h.run(evaluateAlerts, { config: DEFAULT_ALERT_CONFIG })
    const before = await h.backend.events.lastSeq()
    // Push the 61-min bed past 120 min.
    h.clock.advance(60 * 60_000)
    const bed = (await h.backend.repositories.bed.get('bc1'))!
    expect(bed.status).toBe('PENDING_CLEANING')
    const result = await runAlertEvaluation(h.deps, DEFAULT_ALERT_CONFIG)
    expect(result.raised).toBeGreaterThan(0)
    const bc1 = (await h.backend.repositories.alert.list()).filter((a) => a.entityId === 'bc1')
    expect(bc1.map((a) => [a.severity, a.resolvedAt !== undefined]).sort()).toEqual([
      ['CRITICAL', false],
      ['WARNING', true],
    ])
    expect((await types(before)).includes('AlertResolved')).toBe(true)
  })

  it('uses the thresholds it is given', async () => {
    const relaxed = {
      ...DEFAULT_ALERT_CONFIG,
      pendingCleaningWarnMin: 90,
      pendingCleaningCriticalMin: 200,
    }
    await h.run(evaluateAlerts, { config: relaxed })
    const cleaning = (await open()).filter((a) => a.ruleId === 'BED_PENDING_CLEANING_LONG')
    expect(cleaning.map((a) => `${a.entityId}:${a.severity}`)).toEqual(['bc3:WARNING'])
  })
})

describe('acknowledgeAlert', () => {
  const withUser = (id: string) => ({ ...h.deps, actor: id })

  it('records who and when, and emits AlertAcknowledged', async () => {
    await h.run(evaluateAlerts, { config: DEFAULT_ALERT_CONFIG })
    const alert = (await open())[0]!
    const { executeCommand } = await import('./execute')
    const events = await executeCommand(withUser('usr-1'), acknowledgeAlert, { alertId: alert.id })
    expect(events[0]).toMatchObject({
      type: 'AlertAcknowledged',
      actor: 'usr-1',
      payload: { acknowledgedBy: 'usr-1' },
    })
    expect(await h.backend.repositories.alert.get(alert.id)).toMatchObject({
      acknowledgedBy: 'usr-1',
      acknowledgedAt: ALERT_NOW,
    })
    // The next evaluation keeps it (still a problem): acknowledged alerts do not come back.
    await expect(runAlertEvaluation(h.deps, DEFAULT_ALERT_CONFIG)).resolves.toEqual({
      raised: 0,
      resolved: 0,
    })
  })

  it('rejects the simulator, a second acknowledgement, a resolved or an unknown alert', async () => {
    await h.run(evaluateAlerts, { config: DEFAULT_ALERT_CONFIG })
    const alert = (await open())[0]!
    const { executeCommand } = await import('./execute')
    await expect(h.run(acknowledgeAlert, { alertId: alert.id })).rejects.toBeInstanceOf(
      InvalidCommandError,
    )
    await executeCommand(withUser('usr-1'), acknowledgeAlert, { alertId: alert.id })
    await expect(
      executeCommand(withUser('usr-2'), acknowledgeAlert, { alertId: alert.id }),
    ).rejects.toThrow(/already acknowledged/)
    await expect(
      executeCommand(withUser('usr-1'), acknowledgeAlert, { alertId: 'nope' }),
    ).rejects.toBeInstanceOf(InvalidCommandError)
    const other = (await open()).find((a) => a.id !== alert.id)!
    await h.backend.events.append(
      [],
      [{ entity: 'alert', op: 'put', record: { ...other, resolvedAt: ALERT_NOW } }],
    )
    await expect(
      executeCommand(withUser('usr-1'), acknowledgeAlert, { alertId: other.id }),
    ).rejects.toThrow(/already resolved/)
  })
})
