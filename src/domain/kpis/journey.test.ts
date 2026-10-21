import { describe, expect, it } from 'vitest'
import { journeyData } from '@/test/journeyFixture'
import { buildJourney, normalizeText, searchPatients, type JourneyEpisode } from './journey'

const MIN = 60_000
const journey = (id: string) => buildJourney(`p-${id}`, journeyData)!
const episode = (id: string): JourneyEpisode => journey(id).episodes[0]!
const kinds = (e: JourneyEpisode) => e.steps.map((s) => `${s.state[0]}:${s.kind}`)

describe('normalizeText', () => {
  it('drops accents and case', () => {
    expect(normalizeText('  Ángel Núñez ')).toBe('angel nunez')
  })
})

describe('buildJourney: header', () => {
  it('knows the patient, initials and age at the simulated date', () => {
    const j = journey('a')
    expect(j.patient.mrn).toBe('SIM-000A')
    expect(j.initials).toBe('A. R. M.')
    expect(j.ageYears).toBe(2026 - 1985)
  })
  it('is undefined for an unknown patient', () => {
    expect(buildJourney('nope', journeyData)).toBeUndefined()
  })
  it('a patient without episodes has an empty journey', () => {
    expect(journey('i').episodes).toEqual([])
  })
})

describe('buildJourney: ED patients', () => {
  it('waiting for triage: current step is triage, elapsed since arrival', () => {
    const e = episode('a')
    expect(e).toMatchObject({
      status: 'ED_ARRIVED',
      active: true,
      location: { kind: 'ED', area: 'WAITING_ROOM' },
      sinceMs: 20 * MIN,
    })
    expect(kinds(e)).toEqual(['d:EdArrived', 'c:Triaged', 'u:Assessed', 'u:Disposition'])
    expect(e.next).toMatchObject({ kind: 'Triaged', sinceMs: 20 * MIN })
  })

  it('boarding without a bed: next is the bed reservation, no invented ETA', () => {
    const e = episode('b')
    expect(e.status).toBe('ED_BOARDING')
    expect(kinds(e)).toEqual([
      'd:EdArrived',
      'd:Triaged',
      'd:Assessed',
      'd:AdmitDecision',
      'd:BedRequested',
      'c:BedReserved',
      'u:EdLeft',
      'u:Admitted',
    ])
    expect(e.next).toMatchObject({ kind: 'BedReserved', sinceMs: 2 * 60 * MIN })
    expect(e.next?.expectedAt).toBeUndefined()
    const triaged = e.steps.find((s) => s.kind === 'Triaged')!
    expect(triaged).toMatchObject({ triageLevel: 3, sinceMs: 10 * MIN })
  })

  it('bed reserved and transfer open: next is the pickup with the SLA as expected time', () => {
    const e = episode('c')
    expect(e.status).toBe('BED_RESERVED')
    expect(e.location).toEqual({ kind: 'ED', area: 'BOXES' })
    expect(kinds(e)).toEqual([
      'd:EdArrived',
      'd:Triaged',
      'd:Assessed',
      'd:AdmitDecision',
      'd:BedRequested',
      'd:BedReserved',
      'd:TransferRequested',
      'c:TransferPickedUp',
      'u:EdLeft',
      'u:TransferDelivered',
      'u:Admitted',
    ])
    const reserved = e.steps.find((s) => s.kind === 'BedReserved')!
    expect(reserved).toMatchObject({
      at: '2026-10-21T09:30:00.000Z',
      bedLabel: 'Cardiología 5ª Norte B3',
    })
    expect(e.next).toMatchObject({
      kind: 'TransferPickedUp',
      expectedAt: '2026-10-21T10:00:00.000Z',
      sinceMs: 30 * MIN,
    })
    expect(e.steps.find((s) => s.kind === 'Admitted')!.expectedAt).toBe('2026-10-21T10:30:00.000Z')
  })

  it('an ED visit that ended at home is a finished one-step-per-event episode', () => {
    const e = episode('h')
    expect(e).toMatchObject({
      kind: 'ED',
      active: false,
      status: 'ED_LEFT',
      outcome: 'DISCHARGED_HOME',
      location: { kind: 'NONE' },
    })
    expect(kinds(e)).toEqual(['d:EdArrived', 'd:Triaged', 'd:Assessed', 'd:EdLeft'])
    expect(e.next).toBeUndefined()
    expect(e.steps.at(-1)).toMatchObject({ outcome: 'DISCHARGED_HOME', sinceMs: 50 * MIN })
  })
})

describe('buildJourney: admissions', () => {
  it('admitted urgent patient: full history in time order with durations, location and expected discharge', () => {
    const e = episode('d')
    expect(e).toMatchObject({
      status: 'ADMITTED',
      location: { kind: 'BED', label: 'Cardiología 5ª Norte B1' },
    })
    expect(kinds(e)).toEqual([
      'd:EdArrived',
      'd:Triaged',
      'd:Assessed',
      'd:AdmitDecision',
      'd:BedRequested',
      'd:BedReserved',
      'd:TransferRequested',
      'd:TransferPickedUp',
      'd:EdLeft',
      'd:TransferDelivered',
      'd:Admitted',
      'c:ExpectedDischarge',
      'u:DischargeOrdered',
      'u:Discharged',
    ])
    // Done steps are in time order.
    const times = e.steps.filter((s) => s.state === 'done').map((s) => s.at!)
    expect([...times].sort()).toEqual(times)
    expect(e.steps.find((s) => s.kind === 'Admitted')).toMatchObject({
      bedLabel: 'Cardiología 5ª Norte B1',
      sinceMs: 10 * MIN,
    })
    expect(e.next).toMatchObject({
      kind: 'ExpectedDischarge',
      expectedAt: '2026-10-22T09:00:00.000Z',
      sinceMs: 9 * 60 * MIN,
    })
    expect(e.sinceMs).toBe(9 * 60 * MIN)
  })

  it('discharged patient: finished, no next step, no pending steps', () => {
    const e = episode('e')
    expect(e).toMatchObject({ status: 'DISCHARGED', active: false, location: { kind: 'NONE' } })
    expect(e.steps.every((s) => s.state === 'done')).toBe(true)
    expect(e.steps.map((s) => s.kind)).toEqual([
      'Scheduled',
      'BedRequested',
      'BedReserved',
      'Admitted',
      'DischargeOrdered',
      'Discharged',
    ])
    expect(e.next).toBeUndefined()
  })

  it('scheduled patient not arrived: the current step is the planned arrival', () => {
    const e = episode('f')
    expect(e).toMatchObject({ status: 'SCHEDULED', active: true })
    expect(e.next).toMatchObject({ kind: 'Scheduled', expectedAt: '2026-10-21T14:00:00.000Z' })
  })

  it('cancelled admission: ends with the cancellation and its reason from the event', () => {
    const e = episode('g')
    expect(e).toMatchObject({ status: 'CANCELLED', active: false })
    expect(e.steps.at(-1)).toMatchObject({
      kind: 'Cancelled',
      cancelReason: 'NO_BED',
      at: '2026-10-21T08:30:00.000Z',
    })
    expect(e.steps.every((s) => s.state === 'done')).toBe(true)
  })

  it('a reservation without its event keeps the step done but has no time', () => {
    const noEvents = buildJourney('p-c', { ...journeyData, events: [] })!
    const reserved = noEvents.episodes[0]!.steps.find((s) => s.kind === 'BedReserved')!
    expect(reserved.state).toBe('done')
    expect(reserved.at).toBeUndefined()
  })

  it('several episodes: the active one first, then the older ones', () => {
    const j = journey('j')
    expect(j.episodes.map((e) => [e.kind, e.active])).toEqual([
      ['ADMISSION', true],
      ['ED', false],
    ])
    expect(j.episodes[1]).toMatchObject({ outcome: 'DISCHARGED_HOME' })
  })
})

describe('searchPatients', () => {
  const find = (q: string, scope?: Parameters<typeof searchPatients>[2]) =>
    searchPatients(journeyData, q, scope).map((r) => r.patient.id)

  it('needs at least two characters', () => {
    expect(find('')).toEqual([])
    expect(find('a')).toEqual([])
    expect(find(' a ')).toEqual([])
  })
  it('finds by NHC, case-insensitively, by prefix', () => {
    expect(find('sim-000d')).toEqual(['p-d'])
    expect(find('SIM-000')).toHaveLength(10)
  })
  it('finds by first name or surname ignoring accents', () => {
    expect(find('ines')).toEqual(['p-i'])
    expect(find('nunez')).toEqual(['p-i'])
    expect(find('ibañez')).toEqual(['p-h'])
  })
  it('every word must match', () => {
    expect(find('ines gil')).toEqual(['p-i'])
    expect(find('gil pardo')).toEqual(['p-e'])
    expect(find('ines pardo')).toEqual([])
  })
  it('returns the current status and location with each result', () => {
    const [r] = searchPatients(journeyData, 'Clara')
    expect(r).toMatchObject({ initials: 'C. S. G.', episode: { status: 'BED_RESERVED' } })
    expect(searchPatients(journeyData, 'Inés')[0]!.episode).toBeUndefined()
  })
  it('orders by latest activity and caps the list', () => {
    const ids = find('SIM-')
    expect(ids[0]).toBe('p-a') // arrived 09:40: the newest activity
    expect(searchPatients(journeyData, 'SIM-', undefined, 3)).toHaveLength(3)
  })
  it('a unit scope only finds patients with an admission in a bed of those units, and fails closed', () => {
    expect(find('SIM-', { unitIds: new Set(['u1']) }).sort()).toEqual(['p-c', 'p-d'].sort())
    expect(find('SIM-', { unitIds: new Set(['u2']) }).sort()).toEqual(['p-e', 'p-j'])
    expect(find('SIM-', { unitIds: new Set() })).toEqual([])
  })
})

describe('buildJourney: edge cases from review', () => {
  const withData = (patch: Partial<typeof journeyData>) => ({ ...journeyData, ...patch })
  const base = journeyData.transfers.find((t) => t.id === 'tc')!

  it('an older discharged admission in the same bed does not take the newer admission transfer', () => {
    const older = {
      ...journeyData.admissions.find((a) => a.id === 'ad')!,
      id: 'old',
      patientId: 'p-d',
      status: 'DISCHARGED' as const,
      edVisitId: undefined,
      admittedAt: '2026-10-01T10:00:00.000Z',
      dischargedAt: '2026-10-05T10:00:00.000Z',
      expectedDischargeAt: undefined,
    }
    const j = buildJourney('p-d', withData({ admissions: [...journeyData.admissions, older] }))!
    const old = j.episodes.find((e) => e.id === 'old')!
    expect(old.steps.map((s) => s.kind)).not.toContain('TransferRequested')
    expect(j.episodes.find((e) => e.id === 'ad')!.steps.map((s) => s.kind)).toContain(
      'TransferDelivered',
    )
  })

  it('a transfer to the bed first offered still counts when the reservation moved to another bed', () => {
    const moved = journeyData.admissions.map((a) => (a.id === 'ac' ? { ...a, bedId: 'b1' } : a))
    const e = buildJourney('p-c', withData({ admissions: moved }))!.episodes[0]!
    expect(e.steps.map((s) => s.kind)).toContain('TransferRequested')
  })

  it('a cancelled transfer is ignored and the newest live one wins', () => {
    const newer = {
      ...base,
      id: 'tc2',
      requestedAt: '2026-10-21T09:45:00.000Z',
      slaDueAt: '2026-10-21T10:15:00.000Z',
    }
    const cancelled = { ...base, status: 'CANCELLED' as const }
    const e = buildJourney('p-c', withData({ transfers: [cancelled, newer] }))!.episodes[0]!
    expect(e.next).toMatchObject({
      kind: 'TransferPickedUp',
      expectedAt: '2026-10-21T10:15:00.000Z',
    })
  })

  it('a released reservation forgets its time', () => {
    const released = {
      seq: 99,
      id: '00000000-0000-4000-8000-000000000099',
      type: 'BedReservationReleased',
      occurredAt: '2026-10-21T09:40:00.000Z',
      actor: 'simulator',
      entityType: 'Bed',
      entityId: 'b3',
      payload: { bedRequestId: 'rc' },
    } as unknown as (typeof journeyData.events)[number]
    const e = buildJourney('p-c', withData({ events: [...journeyData.events, released] }))!
      .episodes[0]!
    expect(e.steps.find((s) => s.kind === 'BedReserved')!.at).toBeUndefined()
  })

  it('a discharge without an admission time still shows the discharge step', () => {
    const odd = journeyData.admissions.map((a) =>
      a.id === 'ae' ? { ...a, admittedAt: undefined } : a,
    )
    const e = buildJourney('p-e', withData({ admissions: odd }))!.episodes[0]!
    expect(e.steps.at(-1)).toMatchObject({ kind: 'Discharged', state: 'done' })
    expect(e.steps.every((s) => s.state === 'done')).toBe(true)
  })

  it('a cancelled admission with a still-open ED visit does not promise leaving the ED', () => {
    const odd = journeyData.admissions.map((a) =>
      a.id === 'ab' ? { ...a, status: 'CANCELLED' as const } : a,
    )
    const e = buildJourney('p-b', withData({ admissions: odd }))!.episodes[0]!
    expect(e.steps.filter((s) => s.kind === 'EdLeft')).toEqual([])
  })

  it('with a unit scope only the episodes in that unit are shown', () => {
    const scope = { unitIds: new Set(['u2']) }
    const j = buildJourney('p-j', journeyData, scope)!
    expect(j.episodes.map((e) => e.id)).toEqual(['aj']) // the old ED-only visit is not part of the unit
    expect(buildJourney('p-c', journeyData, scope)!.episodes).toEqual([])
  })
})
