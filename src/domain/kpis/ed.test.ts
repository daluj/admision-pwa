import { describe, expect, it } from 'vitest'
import type {
  Admission,
  Bed,
  BedRequest,
  EdVisit,
  Patient,
  TriageLevel,
  Unit,
} from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { computeEd, type EdInput } from './ed'

const NOW = '2026-10-21T10:00:00.000Z' // 12:00 in Madrid
const ago = (minutes: number) => new Date(Date.parse(NOW) - minutes * 60_000).toISOString()

const patientsById = new Map<string, Patient>()
const patient = (id: string, firstName: string, lastName: string): Patient => {
  const p = { ...sampleEntities.patient, id, mrn: `SIM-${id}`, firstName, lastName }
  patientsById.set(id, p)
  return p
}

let n = 0
const visit = (id: string, extra: Partial<EdVisit>): EdVisit => {
  patient(`p-${id}`, `Nombre${++n}`, 'Apellido Ficticio')
  return {
    ...sampleEntities.edVisit,
    id,
    patientId: `p-${id}`,
    arrivedAt: ago(600),
    phase: 'ARRIVED',
    area: 'BOXES',
    chiefComplaint: 'Disnea',
    ...extra,
  }
}

const level = (l: TriageLevel) => ({ triageLevel: l })

const visits: EdVisit[] = [
  // Waiting for triage
  visit('v1', { arrivedAt: ago(12), area: 'WAITING_ROOM' }),
  visit('v2', { arrivedAt: ago(40) }),
  // Waiting for a physician
  visit('v3', { phase: 'TRIAGED', ...level(2), triagedAt: ago(25) }), // target 10 → over, urgent
  visit('v4', { phase: 'TRIAGED', ...level(3), triagedAt: ago(30), area: 'WAITING_ROOM' }), // target 60 → fine
  visit('v5', { phase: 'TRIAGED', ...level(4), triagedAt: ago(130) }), // target 120 → over
  visit('v6', { phase: 'TRIAGED', ...level(1), triagedAt: ago(1) }), // L1 must be immediate → over
  // In assessment: waited 70 min for a physician (target 60) → not within
  visit('v7', { phase: 'IN_ASSESSMENT', ...level(3), triagedAt: ago(90), seenAt: ago(20) }),
  // Boarding
  visit('v8', {
    phase: 'ADMIT_DECISION',
    ...level(3),
    triagedAt: ago(480),
    seenAt: ago(420),
    admitDecisionAt: ago(300),
    targetSpecialtyCode: 'CAR',
  }),
  visit('v9', {
    phase: 'ADMIT_DECISION',
    ...level(2),
    triagedAt: ago(600),
    seenAt: ago(585),
    admitDecisionAt: ago(540),
    targetSpecialtyCode: 'MIN',
  }),
  visit('v10', {
    phase: 'ADMIT_DECISION',
    ...level(4),
    triagedAt: ago(180),
    seenAt: ago(160),
    admitDecisionAt: ago(60),
    targetSpecialtyCode: 'NML',
  }),
  // Gone, but seen in the last 24 h
  visit('v11', {
    phase: 'LEFT_ED',
    ...level(3),
    triagedAt: ago(240),
    seenAt: ago(180),
    endedAt: ago(100),
    outcome: 'DISCHARGED_HOME',
  }), // wait 60 = target → within
  visit('v12', {
    phase: 'LEFT_ED',
    ...level(5),
    triagedAt: ago(3000),
    seenAt: ago(2900),
    endedAt: ago(2800),
    outcome: 'DISCHARGED_HOME',
  }), // > 24 h ago
  visit('v13', {
    phase: 'LEFT_ED',
    ...level(1),
    triagedAt: ago(100),
    seenAt: ago(99),
    endedAt: ago(50),
    outcome: 'DISCHARGED_HOME',
  }), // L1: not a statistic
  visit('v14', {
    phase: 'LEFT_ED',
    ...level(3),
    triagedAt: ago(300),
    seenAt: ago(239),
    endedAt: ago(200),
    outcome: 'DISCHARGED_HOME',
  }), // wait 61 → not within
  visit('v15', { phase: 'LEFT_ED', outcome: 'LWBS', endedAt: ago(30) }), // never seen
]

const unit: Unit = { ...sampleEntities.unit, id: 'u1', name: 'Cardiología 5ª Norte', type: 'WARD' }
const bed = (id: string, label: string): Bed => ({ ...sampleEntities.bed, id, label, unitId: 'u1' })
const adm = (id: string, edVisitId: string, extra: Partial<Admission>): Admission => ({
  ...sampleEntities.admission,
  id,
  edVisitId,
  patientId: `p-${edVisitId}`,
  status: 'AWAITING_BED',
  ...extra,
})
const req = (id: string, admissionId: string, extra: Partial<BedRequest>): BedRequest => ({
  ...sampleEntities.bedRequest,
  id,
  admissionId,
  status: 'OPEN',
  requiredUnitType: 'WARD',
  isolationRequired: false,
  ...extra,
})

const base: EdInput = {
  edVisits: visits,
  admissions: [
    adm('a8', 'v8', { status: 'BED_ASSIGNED', bedId: 'b1' }),
    adm('a9', 'v9', {}),
    adm('a10', 'v10', { status: 'IN_TRANSFER', bedId: 'b2' }),
  ],
  bedRequests: [
    req('r8', 'a8', { status: 'ASSIGNED', assignedBedId: 'b1', preferredSpecialtyCode: 'CAR' }),
    req('r9', 'a9', { preferredSpecialtyCode: 'MIN', isolationRequired: true }),
    req('r10', 'a10', {
      status: 'ASSIGNED',
      assignedBedId: 'b2',
      preferredSpecialtyCode: 'NML',
      requiredUnitType: 'ICU',
    }),
  ],
  beds: [bed('b1', '512-A'), bed('b2', '513-B')],
  units: [unit],
  patients: [...patientsById.values()],
  specialties: [
    { ...sampleEntities.specialty, code: 'CAR', name: 'Cardiología' },
    { ...sampleEntities.specialty, id: 's2', code: 'MIN', name: 'Medicina Interna' },
  ],
  now: NOW,
}
const ed = (extra: Partial<EdInput> = {}) => computeEd({ ...base, ...extra })

describe('computeEd: columns', () => {
  it('puts every visit not yet gone in its phase column', () => {
    const { columns } = ed()
    expect(
      Object.fromEntries(Object.entries(columns).map(([k, v]) => [k, v.map((c) => c.visit.id)])),
    ).toEqual({
      ARRIVED: ['v2', 'v1'], // longest wait first (no triage level yet)
      TRIAGED: ['v6', 'v3', 'v4', 'v5'], // L1, L2, L3, L4
      IN_ASSESSMENT: ['v7'],
      ADMIT_DECISION: ['v9', 'v8', 'v10'], // L2, L3, L4
    })
  })

  it('orders by triage level, then by longest wait', () => {
    const more = [
      visit('w1', { phase: 'TRIAGED', ...level(3), triagedAt: ago(10) }),
      visit('w2', { phase: 'TRIAGED', ...level(3), triagedAt: ago(50) }),
    ]
    const { columns } = ed({ edVisits: [...visits, ...more], patients: [...patientsById.values()] })
    expect(columns.TRIAGED.map((c) => c.visit.id)).toEqual(['v6', 'v3', 'w2', 'v4', 'w1', 'v5'])
  })

  it('measures the wait in the current phase and the Manchester target for triaged patients', () => {
    const { columns } = ed()
    const card = (id: string) =>
      Object.values(columns)
        .flat()
        .find((c) => c.visit.id === id)!
    expect(card('v2').waitMs).toBe(40 * 60_000) // since arrival
    expect(card('v3')).toMatchObject({
      waitMs: 25 * 60_000,
      targetMs: 10 * 60_000,
      overTarget: true,
    })
    expect(card('v4')).toMatchObject({ targetMs: 60 * 60_000, overTarget: false })
    expect(card('v6')).toMatchObject({ targetMs: 0, overTarget: true })
    expect(card('v7').waitMs).toBe(20 * 60_000) // since seen
    expect(card('v7').targetMs).toBeUndefined()
    expect(card('v8').waitMs).toBe(300 * 60_000) // since the admit decision
  })

  it('a wait exactly at the target is not over it', () => {
    const exact = [visit('t1', { phase: 'TRIAGED', ...level(3), triagedAt: ago(60) })]
    const { columns } = ed({ edVisits: exact, patients: [...patientsById.values()] })
    expect(columns.TRIAGED[0]).toMatchObject({ waitMs: 60 * 60_000, overTarget: false })
  })

  it('shows initials on the card and keeps the full identity separate', () => {
    const { columns } = ed()
    const v2 = columns.ARRIVED[0]!
    expect(v2.initials).toMatch(/^[A-ZÁÉÍÓÚÑ]\. [A-Z]\. F\.$/)
    expect(v2.fullName).toContain('Apellido Ficticio')
    expect(v2.mrn).toBe(`SIM-p-v2`)
    expect(v2.area).toBe('BOXES')
    expect(v2.chiefComplaint).toBe('Disnea')
  })
})

describe('computeEd: KPIs', () => {
  it('counts patients present, by area, and waiting by phase', () => {
    const { kpis } = ed()
    expect(kpis).toMatchObject({
      present: 10,
      inWaitingRoom: 2,
      inBoxes: 8,
      waitingTriage: 2,
      oldestTriageWaitMs: 40 * 60_000,
      waitingPhysician: 4,
      overTarget: 3,
      overTargetUrgent: 2,
    })
  })

  it('has no oldest wait when nobody is waiting for triage', () => {
    const { kpis } = ed({ edVisits: [] })
    expect(kpis).toMatchObject({
      present: 0,
      waitingTriage: 0,
      oldestTriageWaitMs: null,
      longestBoardingMs: null,
      withinPct: null,
    })
  })

  it('counts boarding, those with a bed, the longest and those over 4 h', () => {
    expect(ed().kpis).toMatchObject({
      boarding: 3,
      boardingWithBed: 2,
      longestBoardingMs: 540 * 60_000,
      boardingOverFourHours: 2,
    })
  })

  it('% seen within target: L2–L5 seen in the last 24 h; boundary at the target; L1 and old visits excluded', () => {
    const { kpis } = ed()
    // v7 (70 > 60 ✗), v8 (60 ✓), v9 (15 > 10 ✗), v10 (20 ✓), v11 (60 ✓), v14 (61 ✗) → 3 of 6.
    // v12 is older than 24 h, v13 is L1, v15 was never seen.
    expect(kpis.seen24h).toBe(6)
    expect(kpis.within24h).toBe(3)
    expect(kpis.withinPct).toBeCloseTo(0.5)
  })

  it('an empty list of seen patients gives no percentage, not 0 %', () => {
    const waiting = [visit('x', { phase: 'TRIAGED', ...level(3), triagedAt: ago(5) })]
    const { kpis } = ed({ edVisits: waiting, patients: [...patientsById.values()] })
    expect(kpis.seen24h).toBe(0)
    expect(kpis.withinPct).toBeNull()
  })
})

describe('computeEd: boarding rows', () => {
  it('lists boarders longest first with specialty name, unit type, isolation and bed state', () => {
    const { boarding } = ed()
    expect(boarding.map((r) => r.visit.id)).toEqual(['v9', 'v8', 'v10'])
    expect(boarding[0]).toMatchObject({
      specialtyName: 'Medicina Interna',
      unitType: 'WARD',
      isolationRequired: true,
      sinceDecisionMs: 540 * 60_000,
      state: { kind: 'NO_BED' },
    })
    expect(boarding[1]).toMatchObject({
      specialtyName: 'Cardiología',
      state: { kind: 'RESERVED', bedLabel: '512-A', unitName: 'Cardiología 5ª Norte' },
    })
    expect(boarding[2]).toMatchObject({
      specialtyName: 'NML', // no such specialty row: falls back to the code
      unitType: 'ICU',
      state: { kind: 'IN_TRANSFER', bedLabel: '513-B' },
    })
  })

  it('a boarder without admission or request still appears, with no bed', () => {
    const { boarding } = ed({ admissions: [], bedRequests: [] })
    expect(boarding).toHaveLength(3)
    expect(boarding.every((r) => r.state.kind === 'NO_BED')).toBe(true)
    expect(boarding.find((r) => r.visit.id === 'v8')!.specialtyName).toBe('Cardiología')
  })
})

describe('computeEd: exceptions', () => {
  it('flags late triaged patients and long boarders, most severe and oldest first', () => {
    const { exceptions } = ed()
    expect(exceptions.map((e) => `${e.severity}:${e.id}`)).toEqual([
      'critical:boarding:v9', // 9 h
      'critical:triage:v3', // L2, 25 min
      'critical:triage:v6', // L1, 1 min
      'warn:boarding:v8', // 5 h
      'warn:triage:v5', // L4, 130 min
    ])
    expect(exceptions.find((e) => e.id === 'triage:v3')).toMatchObject({
      level: 2,
      targetMin: 10,
      waitMs: 25 * 60_000,
    })
  })

  it.each([
    [239, false, undefined],
    [241, true, 'warn'],
    [480, true, 'warn'],
    [481, true, 'critical'],
  ])('a boarder waiting %i min → exception %s (%s)', (minutes, raised, severity) => {
    const only = [
      visit('b', { phase: 'ADMIT_DECISION', ...level(4), admitDecisionAt: ago(minutes) }),
    ]
    const found = ed({
      edVisits: only,
      admissions: [],
      bedRequests: [],
      patients: [...patientsById.values()],
    }).exceptions
    expect(found.length).toBe(raised ? 1 : 0)
    if (raised) expect(found[0]).toMatchObject({ kind: 'boardingLong', severity })
  })

  it('a patient at or under target is not an exception; L1 is over at any wait', () => {
    const only = [
      visit('ok', { phase: 'TRIAGED', ...level(3), triagedAt: ago(60) }),
      visit('l1', { phase: 'TRIAGED', ...level(1), triagedAt: ago(1) }),
      visit('l1-now', { phase: 'TRIAGED', ...level(1), triagedAt: ago(0) }),
    ]
    const found = ed({
      edVisits: only,
      admissions: [],
      bedRequests: [],
      patients: [...patientsById.values()],
    }).exceptions
    expect(found.map((e) => e.id)).toEqual(['triage:l1'])
  })
})

describe('computeEd: hourly series', () => {
  it('has 24 consecutive hour buckets ending at the current clock hour', () => {
    const { hourly } = ed()
    expect(hourly).toHaveLength(24)
    expect(hourly.at(-1)!.start).toBe('2026-10-21T10:00:00.000Z')
    expect(hourly[0]!.start).toBe('2026-10-20T11:00:00.000Z')
    for (let i = 1; i < 24; i++) {
      expect(Date.parse(hourly[i]!.start) - Date.parse(hourly[i - 1]!.start)).toBe(3_600_000)
    }
  })

  it('counts patients by the hour they were seen, with gaps for empty hours', () => {
    const { hourly } = ed()
    const at = (iso: string) => hourly.find((b) => b.start === iso)!
    // 07:00Z: v11 (seen 07:00, ✓) and v10 (seen 07:20, ✓). 06:00Z: v14 (seen 06:01, ✗).
    expect(at('2026-10-21T07:00:00.000Z')).toMatchObject({ seen: 2, within: 2, pct: 1 })
    expect(at('2026-10-21T06:00:00.000Z')).toMatchObject({ seen: 1, within: 0, pct: 0 })
    // An hour nobody was seen is a gap, not 0 %.
    expect(hourly.some((b) => b.seen === 0 && b.pct === null)).toBe(true)
  })

  it('splits an hour correctly: 2 seen, 1 within → 50 %', () => {
    const pair = [
      visit('h1', {
        phase: 'LEFT_ED',
        ...level(3),
        triagedAt: '2026-10-21T08:00:00.000Z',
        seenAt: '2026-10-21T08:30:00.000Z',
      }),
      visit('h2', {
        phase: 'LEFT_ED',
        ...level(3),
        triagedAt: '2026-10-21T08:00:00.000Z',
        seenAt: '2026-10-21T09:10:00.000Z',
      }),
    ]
    const bucket = ed({ edVisits: pair, admissions: [], bedRequests: [] }).hourly.find(
      (b) => b.start === '2026-10-21T08:00:00.000Z',
    )!
    expect(bucket).toMatchObject({ seen: 1, within: 1, pct: 1 })
    const both = [
      visit('h3', {
        phase: 'LEFT_ED',
        ...level(3),
        triagedAt: '2026-10-21T08:00:00.000Z',
        seenAt: '2026-10-21T08:10:00.000Z',
      }),
      visit('h4', {
        phase: 'LEFT_ED',
        ...level(3),
        triagedAt: '2026-10-21T07:00:00.000Z',
        seenAt: '2026-10-21T08:50:00.000Z',
      }),
    ]
    const half = ed({ edVisits: both, admissions: [], bedRequests: [] }).hourly.find(
      (b) => b.start === '2026-10-21T08:00:00.000Z',
    )!
    expect(half).toMatchObject({ seen: 2, within: 1, pct: 0.5 })
  })

  it('keeps 24 one-hour steps across the end of summer time and midnight', () => {
    for (const now of [
      '2026-10-25T10:00:00.000Z',
      '2026-10-24T22:30:00.000Z',
      '2026-03-29T10:00:00.000Z',
    ]) {
      const { hourly } = ed({ now })
      expect(hourly).toHaveLength(24)
      expect(Date.parse(hourly.at(-1)!.start)).toBe(
        Math.floor(Date.parse(now) / 3_600_000) * 3_600_000,
      )
      for (let i = 1; i < 24; i++) {
        expect(Date.parse(hourly[i]!.start) - Date.parse(hourly[i - 1]!.start)).toBe(3_600_000)
      }
    }
  })
})
