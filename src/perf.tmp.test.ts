import { writeFileSync, appendFileSync } from 'node:fs'
import { it } from 'vitest'
import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { computeCensus, computeEd, computeAdmissions, computeTransfers } from '@/domain/kpis'
import { alertCandidates, DEFAULT_ALERT_CONFIG } from '@/domain/alerts'
import { runSimulation } from '@/simulator/runner'
import { getScenario } from '@/simulator/scenarios/registry'
import { resetDemo } from '@/simulator/seed/seedDemo'

const OUT = '/private/tmp/claude-501/-Users-david-Documents-Proyectos-admision-pwa/1c55818b-2c2a-4a12-9e4e-c3f82b1633d0/scratchpad/perf.out'
writeFileSync(OUT, '')
const log = (...a: unknown[]) => appendFileSync(OUT, a.join(' ') + '\n')

it('perf: 7 days', async () => {
  const backend = createMemoryBackend({ clock: createFixedClock('2026-10-21T10:00:00.000Z') })
  await resetDemo(backend, 42)
  let t = performance.now()
  await runSimulation({
    backend,
    scenario: getScenario('normal-day')!,
    durationMs: 7 * 24 * 3_600_000,
  })
  log('SIM 7 days ms', Math.round(performance.now() - t))
  const r = backend.repositories
  t = performance.now()
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
  log(
    'LOAD ms',
    Math.round(performance.now() - t),
    'events',
    events.length,
    'patients',
    patients.length,
    'admissions',
    admissions.length,
    'edVisits',
    edVisits.length,
    'transfers',
    transfers.length,
  )
  const now = (await r.simulationState.get('current'))!.simNow
  const time = (label: string, fn: () => unknown) => {
    const s = performance.now()
    for (let i = 0; i < 5; i++) fn()
    log(label, Math.round((performance.now() - s) / 5), 'ms')
  }
  time('census', () => computeCensus({ beds, units, admissions, patients, now }))
  time('ed', () =>
    computeEd({ edVisits, admissions, bedRequests, beds, units, patients, specialties, now }),
  )
  time('admissions(events 5000)', () =>
    computeAdmissions({
      admissions,
      beds,
      units,
      patients,
      specialties,
      edVisits,
      events: events.slice(-5000),
      now,
    }),
  )
  time('transfers', () => computeTransfers({ transfers, porters, patients, now }))
  time('alerts', () =>
    alertCandidates(
      {
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
      },
      DEFAULT_ALERT_CONFIG,
    ),
  )
}, 600_000)
