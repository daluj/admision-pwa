import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { alertCandidates, computeOverview, DEFAULT_ALERT_CONFIG } from '@/domain/alerts'
import {
  computeAdmissions,
  computeCensus,
  computeEd,
  computeTransfers,
  JOURNEY_EVENT_WINDOW,
} from '@/domain/kpis'
import { runSimulation } from '@/simulator/runner'
import { getScenario } from '@/simulator/scenarios/registry'
import { resetDemo } from '@/simulator/seed/seedDemo'

/**
 * Opt-in (`npm run perf`): ~600 beds and 7 simulated days of the pressure scenario, then the cost of
 * loading the tables and of every dashboard calculator. Budgets are generous (CI machines vary);
 * the numbers are printed so a regression is visible long before a budget breaks.
 */
// Node's `process` is not in the app's TypeScript environment: read it defensively.
const node = (
  globalThis as {
    process?: { env: Record<string, string | undefined>; stderr: { write: (s: string) => void } }
  }
).process
const enabled = node?.env.PERF === '1'
const DAY = 24 * 3_600_000
const BUDGET_MS = { each: 50, all: 150 }

describe.skipIf(!enabled)('performance with ~600 beds and 7 simulated days', () => {
  it('keeps every dashboard calculator within budget', async () => {
    const backend = createMemoryBackend({ clock: createFixedClock('2026-10-21T10:00:00.000Z') })
    await resetDemo(backend, 42, undefined, 'high-pressure')
    const t0 = performance.now()
    await runSimulation({ backend, scenario: getScenario('high-pressure')!, durationMs: 7 * DAY })
    const simMs = performance.now() - t0

    const r = backend.repositories
    const t1 = performance.now()
    const [
      beds,
      units,
      admissions,
      patients,
      edVisits,
      bedRequests,
      specialties,
      transfers,
      porters,
      events,
    ] = await Promise.all([
      r.bed.list(),
      r.unit.list(),
      r.admission.list(),
      r.patient.list(),
      r.edVisit.list(),
      r.bedRequest.list(),
      r.specialty.list(),
      r.transferRequest.list(),
      r.porter.list(),
      backend.events.list(),
    ])
    const loadMs = performance.now() - t1
    const now = (await r.simulationState.get('current'))!.simNow
    const recent = events.slice(-JOURNEY_EVENT_WINDOW)

    const time = (fn: () => unknown, runs = 5) => {
      fn() // warm up
      const start = performance.now()
      for (let i = 0; i < runs; i++) fn()
      return (performance.now() - start) / runs
    }
    const input = {
      edVisits,
      admissions,
      bedRequests,
      beds,
      units,
      patients,
      specialties,
      transfers,
      porters,
      now,
    }
    const costs = {
      census: time(() => computeCensus({ beds, units, admissions, patients, now })),
      ed: time(() =>
        computeEd({ edVisits, admissions, bedRequests, beds, units, patients, specialties, now }),
      ),
      admissions: time(() =>
        computeAdmissions({
          admissions,
          beds,
          units,
          patients,
          specialties,
          edVisits,
          events: recent,
          now,
        }),
      ),
      transfers: time(() => computeTransfers({ transfers, porters, patients, now })),
      alerts: time(() => alertCandidates(input, DEFAULT_ALERT_CONFIG)),
      overview: time(() => computeOverview(input, DEFAULT_ALERT_CONFIG)),
    }
    const report = {
      beds: beds.length,
      events: events.length,
      patients: patients.length,
      admissions: admissions.length,
      edVisits: edVisits.length,
      simulated7DaysMs: Math.round(simMs),
      loadAllTablesMs: Math.round(loadMs),
      ...Object.fromEntries(
        Object.entries(costs).map(([k, v]) => [`${k}Ms`, Math.round(v * 10) / 10]),
      ),
    }
    node?.stderr.write(`\nPERF ${JSON.stringify(report)}\n`)

    expect(beds.length).toBeGreaterThanOrEqual(590)
    for (const [name, ms] of Object.entries(costs)) expect(ms, name).toBeLessThan(BUDGET_MS.each)
    expect(
      costs.census + costs.ed + costs.admissions + costs.transfers + costs.alerts,
    ).toBeLessThan(BUDGET_MS.all)
  }, 900_000)
})
