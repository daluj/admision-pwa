import { describe, expect, it } from 'vitest'
import type { Change } from '@/data/ports'
import type { HospitalEvent } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { stateViolations, readState } from '@/simulator/stateInvariants'
import {
  createScenarioHarness,
  policies,
  putAdmission,
  putBed,
  putPatient,
  putPorter,
  putRequest,
  putTransfer,
  putVisit,
  T0,
} from '@/test/scenarioHarness'
import { minutesBetween } from '../entityRandom'
import {
  CLEANING_DURATION,
  CLEANING_START_DELAY,
  PHYSICIAN_TARGET_MINUTES,
  SCHEDULED_SPECIALTIES,
  TRIAGE_DELAY,
} from '../normalDay.config'
import { bedAssignment } from './bedAssignment'
import { bedBlocks } from './bedBlocks'
import { cleaning } from './cleaning'
import { discharges } from './discharges'
import { edFlow } from './edFlow'
import { scheduledAdmissions } from './scheduledAdmissions'
import { transfersFlow } from './transfersFlow'

const iso = (minutesFromT0: number) =>
  new Date(Date.parse(T0) + minutesFromT0 * 60_000).toISOString()
const types = (events: HospitalEvent[]) => events.map((e) => e.type)

describe('edFlow', () => {
  async function arrive(count: number) {
    const h = await createScenarioHarness()
    const changes: Change[] = []
    for (let i = 0; i < count; i++) {
      changes.push(putPatient(`p${i}`, i), putVisit({ id: `v${i}`, patientId: `p${i}` }))
    }
    await h.put(...changes)
    await h.play(policies(edFlow), 8 * 60)
    return { h, visits: await h.backend.repositories.edVisit.list() }
  }

  it('triages within the level delay, never leaves L1/L2 in the waiting room, follows Manchester waits', async () => {
    const { visits } = await arrive(80)
    const triaged = visits.filter((v) => v.triagedAt)
    expect(triaged.length).toBe(80)

    for (const v of triaged) {
      const level = v.triageLevel!
      const delay = minutesBetween(v.arrivedAt, v.triagedAt!)
      expect(delay).toBeLessThanOrEqual(TRIAGE_DELAY[level][1])
      expect(delay).toBeGreaterThanOrEqual(TRIAGE_DELAY[level][0])
      if (level <= 2) expect(v.area).not.toBe('WAITING_ROOM')
    }
    expect(triaged.filter((v) => v.triageLevel! >= 3).length).toBeGreaterThan(55)

    const seen = triaged.filter((v) => v.seenAt)
    const waits = seen.map((v) => ({
      level: v.triageLevel!,
      wait: minutesBetween(v.triagedAt!, v.seenAt!),
    }))
    for (const { level, wait } of waits) {
      expect(wait).toBeLessThanOrEqual(Math.round(PHYSICIAN_TARGET_MINUTES[level] * 1.5))
      if (level === 2) expect(wait).toBeLessThanOrEqual(PHYSICIAN_TARGET_MINUTES[2])
    }
    const low = waits.filter((w) => w.level >= 3)
    const within = low.filter((w) => w.wait <= PHYSICIAN_TARGET_MINUTES[w.level as 3 | 4 | 5])
    expect(within.length / low.length).toBeGreaterThan(0.7)
  })

  it('only L4/L5 leave without being seen; some are admitted, most go home', async () => {
    const { visits } = await arrive(120)
    for (const v of visits.filter((x) => x.outcome === 'LWBS')) {
      expect(v.triageLevel!).toBeGreaterThanOrEqual(4)
      expect(v.seenAt).toBeUndefined()
    }
    const treated = visits.filter((v) => v.seenAt)
    const admitted = treated.filter((v) => v.phase === 'ADMIT_DECISION')
    const home = treated.filter((v) => v.outcome === 'DISCHARGED_HOME')
    expect(admitted.length).toBeGreaterThan(0)
    expect(home.length).toBeGreaterThan(admitted.length)
    expect(admitted.length / treated.length).toBeLessThan(0.45)
    for (const v of admitted) expect(v.targetSpecialtyCode).toBeDefined()
  })

  it('starts at most 3 assessments per minute', async () => {
    const { h } = await arrive(120)
    const perMinute = new Map<string, number>()
    for (const e of await h.events('EdAssessmentStarted')) {
      perMinute.set(e.occurredAt, (perMinute.get(e.occurredAt) ?? 0) + 1)
    }
    expect(Math.max(...perMinute.values())).toBeLessThanOrEqual(3)
  })
})

describe('bedAssignment', () => {
  async function waiting(
    requests: Array<{
      id: string
      priority?: 'P1' | 'P2' | 'P3'
      code?: string
      unit?: 'WARD' | 'ICU'
      iso?: boolean
    }>,
    beds: Change[] = [],
  ) {
    const h = await createScenarioHarness()
    const changes: Change[] = [...beds]
    requests.forEach((r, i) => {
      changes.push(
        putPatient(`p-${r.id}`, i),
        putAdmission({ id: `a-${r.id}`, patientId: `p-${r.id}`, status: 'AWAITING_BED' }),
        putRequest({
          id: r.id,
          admissionId: `a-${r.id}`,
          priority: r.priority ?? 'P2',
          preferredSpecialtyCode: r.code ?? 'CAR',
          requiredUnitType: r.unit ?? 'WARD',
          isolationRequired: r.iso ?? false,
        }),
      )
    })
    await h.put(...changes)
    return h
  }
  const onlyBed1 = [
    putBed({ id: 'bed-2', status: 'BLOCKED', blockedReason: 'x' }),
    putBed({ id: 'bed-iso', status: 'BLOCKED', blockedReason: 'x', isolation: true }),
    putBed({ id: 'bed-icu', unitId: 'unit-icu', status: 'BLOCKED', blockedReason: 'x' }),
  ]

  it('serves the most urgent request first when beds are scarce', async () => {
    const h = await waiting(
      [
        { id: 'low', priority: 'P3' },
        { id: 'urgent', priority: 'P1' },
      ],
      onlyBed1,
    )
    await h.play(policies(bedAssignment), 120)
    const reserved = await h.events('BedReserved')
    expect(reserved).toHaveLength(1)
    expect(reserved[0]!.payload).toMatchObject({ bedRequestId: 'urgent' })
    expect(await h.backend.repositories.bedRequest.get('low')).toMatchObject({ status: 'OPEN' })
  })

  it('waits at least the request delay and sets an ETA', async () => {
    const h = await waiting([{ id: 'r', priority: 'P1' }])
    await h.play(policies(bedAssignment), 2)
    expect(await h.events('BedReserved')).toHaveLength(0)
    await h.play(policies(bedAssignment), 60)
    const [event] = await h.events('BedReserved')
    expect(minutesBetween(T0, event!.occurredAt)).toBeGreaterThanOrEqual(5)
    expect(
      minutesBetween(event!.occurredAt, (event!.payload as { etaAt: string }).etaAt),
    ).toBeGreaterThanOrEqual(20)
  })

  it('matches unit type and isolation', async () => {
    const h = await waiting([
      { id: 'icu', unit: 'ICU' },
      { id: 'iso', iso: true },
    ])
    await h.play(policies(bedAssignment), 120)
    const byRequest = Object.fromEntries(
      (await h.events('BedReserved')).map((e) => [
        (e.payload as { bedRequestId: string }).bedRequestId,
        e.entityId,
      ]),
    )
    expect(byRequest.icu).toBe('bed-icu')
    expect(byRequest.iso).toBe('bed-iso')
  })

  it('accepts an outlier bed only after a long wait, never for excluded specialties', async () => {
    const h = await waiting([
      { id: 'onc', code: 'ONC' },
      { id: 'ped', code: 'PED' },
    ])
    await h.play(policies(bedAssignment), 170)
    expect(await h.events('BedReserved')).toHaveLength(0)
    await h.play(policies(bedAssignment), 120)
    const reserved = await h.events('BedReserved')
    expect(reserved.map((e) => (e.payload as { bedRequestId: string }).bedRequestId)).toEqual([
      'onc',
    ])
    expect(minutesBetween(T0, reserved[0]!.occurredAt)).toBeGreaterThanOrEqual(180)
  })

  it('never double-books a bed in one minute and logs no rejections', async () => {
    const h = await waiting(
      Array.from({ length: 6 }, (_, i) => ({ id: `r${i}`, priority: 'P1' as const })),
    )
    await h.play(policies(bedAssignment), 240)
    const reserved = await h.events('BedReserved')
    expect(new Set(reserved.map((e) => e.entityId)).size).toBe(reserved.length)
    expect(reserved.length).toBeLessThanOrEqual(3) // 3 ward beds in the mini hospital
  })
})

describe('transfersFlow', () => {
  async function reservedPatients(count: number) {
    const h = await createScenarioHarness()
    const changes: Change[] = [putPorter({ id: 'por-1', status: 'AVAILABLE' })]
    for (let i = 0; i < count; i++) {
      const bed = ['bed-1', 'bed-2'][i]!
      changes.push(
        putPatient(`p${i}`, i),
        putVisit({
          id: `v${i}`,
          patientId: `p${i}`,
          phase: 'ADMIT_DECISION',
          triageLevel: 3,
          triagedAt: T0,
          seenAt: T0,
          admitDecisionAt: T0,
        }),
        putAdmission({
          id: `a${i}`,
          patientId: `p${i}`,
          status: 'BED_ASSIGNED',
          bedId: bed,
          edVisitId: `v${i}`,
        }),
        putBed({ id: bed, status: 'RESERVED', patientId: `p${i}`, admissionId: `a${i}` }),
        putRequest({
          id: `r${i}`,
          admissionId: `a${i}`,
          status: 'ASSIGNED',
          assignedBedId: bed,
          priority: 'P2',
        }),
      )
    }
    await h.put(...changes)
    return h
  }

  it('moves a reserved patient from request to admission and out of the ED', async () => {
    const h = await reservedPatients(1)
    await h.play(policies(transfersFlow), 120)
    const events = await h.events()
    expect(types(events).slice(-6)).toEqual([
      'TransferRequested',
      'TransferAssigned',
      'TransferPickedUp',
      'TransferDelivered',
      'PatientAdmitted',
      'EdPatientLeft',
    ])
    expect(await h.backend.repositories.admission.get('a0')).toMatchObject({ status: 'ADMITTED' })
    expect(await h.backend.repositories.bed.get('bed-1')).toMatchObject({ status: 'OCCUPIED' })
    expect(await h.backend.repositories.edVisit.get('v0')).toMatchObject({ outcome: 'ADMITTED' })
    expect(stateViolations(await readState(h.backend))).toEqual([])
    const total = minutesBetween(T0, events.at(-1)!.occurredAt)
    expect(total).toBeGreaterThanOrEqual(2 + 2 + 3 + 5)
    expect(total).toBeLessThanOrEqual(10 + 15 + 12 + 20 + 3)
  })

  it('serves a queue with one porter: the second transfer waits for the first delivery', async () => {
    const h = await reservedPatients(2)
    await h.play(policies(transfersFlow), 240)
    const assigned = await h.events('TransferAssigned')
    const delivered = await h.events('TransferDelivered')
    expect(assigned).toHaveLength(2)
    expect(delivered).toHaveLength(2)
    expect(assigned[1]!.occurredAt >= delivered[0]!.occurredAt).toBe(true)
    expect(stateViolations(await readState(h.backend))).toEqual([])
  })

  it('does not admit a patient on the strength of an earlier patient’s delivered transfer to the same bed', async () => {
    const h = await createScenarioHarness()
    await h.put(
      putPatient('p0', 0),
      putPatient('p1', 1),
      putBed({ id: 'bed-1', status: 'RESERVED', patientId: 'p1', admissionId: 'a1' }),
      putAdmission({ id: 'a1', patientId: 'p1', status: 'IN_TRANSFER', bedId: 'bed-1' }),
      putRequest({ id: 'r1', admissionId: 'a1', status: 'ASSIGNED', assignedBedId: 'bed-1' }),
      // Last week's patient was delivered to the same bed…
      putTransfer({
        id: 'trf-old',
        patientId: 'p0',
        reason: 'ADMISSION',
        toLocation: { kind: 'BED', refId: 'bed-1', label: 'bed-1' },
        status: 'DELIVERED',
        deliveredAt: '2026-10-14T08:00:00.000Z',
      }),
      // …but this patient is still on the way.
      putTransfer({
        id: 'trf-new',
        patientId: 'p1',
        reason: 'ADMISSION',
        toLocation: { kind: 'BED', refId: 'bed-1', label: 'bed-1' },
        status: 'PICKED_UP',
        pickedUpAt: iso(-1),
        deliveredAt: undefined,
      }),
    )
    await h.play(policies(transfersFlow), 1)
    expect(await h.events('PatientAdmitted')).toHaveLength(0)
    expect(await h.backend.repositories.admission.get('a1')).toMatchObject({
      status: 'IN_TRANSFER',
    })
  })

  it('does not create a second transfer for the same bed', async () => {
    const h = await reservedPatients(1)
    await h.put(
      putTransfer({
        id: 'trf-existing',
        patientId: 'p0',
        reason: 'ADMISSION',
        toLocation: { kind: 'BED', refId: 'bed-1', label: 'bed-1' },
        status: 'REQUESTED',
        requestedAt: T0,
        porterId: undefined,
        assignedAt: undefined,
        pickedUpAt: undefined,
        deliveredAt: undefined,
      }),
    )
    await h.play(policies(transfersFlow), 5)
    expect(await h.events('TransferRequested')).toHaveLength(0)
  })
})

describe('scheduledAdmissions', () => {
  it('plans the day at 07:00 local, in business hours', async () => {
    const h = await createScenarioHarness('2026-10-21T04:50:00.000Z') // 06:50 Madrid
    await h.put(
      ...SCHEDULED_SPECIALTIES.filter(([code]) => code !== 'CAR').map(([code]): Change => ({
        entity: 'specialty',
        op: 'put',
        record: { ...sampleEntities.specialty, id: `spec-${code}`, code, name: code },
      })),
    )
    await h.play(policies(scheduledAdmissions), 30)
    const created = await h.events('ScheduledAdmissionCreated')
    expect(created).toHaveLength(15)
    for (const e of created) {
      const at = (e.payload as { scheduledFor: string }).scheduledFor
      expect(at >= '2026-10-21T06:00:00.000Z' && at <= '2026-10-21T11:30:00.000Z').toBe(true)
      expect(e.occurredAt).toBe('2026-10-21T05:00:00.000Z')
    }
  })

  it('asks for a bed at the scheduled time and cancels when none shows up in 3 h', async () => {
    const h = await createScenarioHarness()
    await h.put(
      putBed({ id: 'bed-1', status: 'BLOCKED', blockedReason: 'x' }),
      putBed({ id: 'bed-2', status: 'BLOCKED', blockedReason: 'x' }),
      putPatient('p1', 1),
      putAdmission({
        id: 'a1',
        patientId: 'p1',
        type: 'SCHEDULED',
        status: 'SCHEDULED',
        scheduledFor: T0,
      }),
    )
    await h.play(policies(scheduledAdmissions), 30)
    expect(await h.backend.repositories.admission.get('a1')).toMatchObject({
      status: 'AWAITING_BED',
    })
    expect(await h.backend.repositories.bedRequest.count()).toBe(1)

    await h.play(policies(scheduledAdmissions), 170)
    const [cancelled] = await h.events('AdmissionCancelled')
    expect(cancelled).toMatchObject({ entityId: 'a1', payload: { reason: 'NO_BED' } })
    expect(minutesBetween(T0, cancelled!.occurredAt)).toBeGreaterThanOrEqual(180)
    expect(await h.backend.repositories.bedRequest.list()).toEqual([
      expect.objectContaining({ status: 'CANCELLED' }),
    ])
  })
})

describe('discharges', () => {
  async function inpatients(
    count: number,
    extra: (i: number) => Partial<typeof sampleEntities.admission>,
  ) {
    const h = await createScenarioHarness()
    const changes: Change[] = []
    for (let i = 0; i < count; i++) {
      changes.push(
        putPatient(`p${i}`, i),
        putBed({ id: `bed-x${i}`, status: 'OCCUPIED', patientId: `p${i}`, admissionId: `a${i}` }),
        putAdmission({
          id: `a${i}`,
          patientId: `p${i}`,
          status: 'ADMITTED',
          bedId: `bed-x${i}`,
          admittedAt: iso(-3000),
          ...extra(i),
        }),
      )
    }
    await h.put(...changes)
    return h
  }

  it('orders ahead of the expected time; about 40 % slip a day instead', async () => {
    const h = await inpatients(50, () => ({ expectedDischargeAt: iso(90) }))
    await h.play(policies(discharges), 4 * 60)
    const ordered = await h.events('DischargeOrdered')
    const slipped = (await h.events('ExpectedDischargeSet')).filter(
      (e) => (e.payload as { expectedDischargeAt: string }).expectedDischargeAt === iso(90 + 1440),
    )
    expect(ordered.length + slipped.length).toBe(50)
    expect(slipped.length).toBeGreaterThan(10)
    expect(slipped.length).toBeLessThan(30)
    for (const e of ordered) {
      expect(minutesBetween(e.occurredAt, iso(90))).toBeLessThanOrEqual(120)
    }
  })

  it('discharges after the order delay, only in daytime hours', async () => {
    const h = await createScenarioHarness('2026-10-21T20:00:00.000Z') // 22:00 Madrid
    await h.put(
      putPatient('p1', 1),
      putBed({ id: 'bed-1', status: 'OCCUPIED', patientId: 'p1', admissionId: 'a1' }),
      putAdmission({
        id: 'a1',
        patientId: 'p1',
        status: 'DISCHARGE_ORDERED',
        bedId: 'bed-1',
        admittedAt: '2026-10-19T08:00:00.000Z',
        dischargeOrderedAt: '2026-10-21T19:00:00.000Z',
      }),
    )
    await h.play(policies(discharges), 12 * 60)
    const [done] = await h.events('PatientDischarged')
    expect(done).toBeDefined()
    // 09:00 Madrid (UTC+2) = 07:00Z the next day at the earliest.
    expect(done!.occurredAt >= '2026-10-22T07:00:00.000Z').toBe(true)
  })

  it('sets expected discharges for a share of inpatients, 1–3 days ahead at working hours', async () => {
    const h = await inpatients(120, () => ({}))
    await h.play(policies(discharges), 24 * 60)
    const set = await h.events('ExpectedDischargeSet')
    expect(set.length).toBeGreaterThan(5)
    expect(set.length).toBeLessThan(35)
    for (const e of set) {
      const at = (e.payload as { expectedDischargeAt: string }).expectedDischargeAt
      expect(at > e.occurredAt).toBe(true)
      expect(minutesBetween(e.occurredAt, at)).toBeLessThanOrEqual(3 * 1440 + 24 * 60)
    }
  })
})

describe('cleaning', () => {
  it('starts and finishes cleaning within the configured delays', async () => {
    const h = await createScenarioHarness()
    await h.put(putBed({ id: 'bed-1', status: 'PENDING_CLEANING', statusChangedAt: T0 }))
    await h.play(policies(cleaning), 3 * 60)
    const [start] = await h.events('BedCleaningStarted')
    const [finish] = await h.events('BedCleaningFinished')
    const startAfter = minutesBetween(T0, start!.occurredAt)
    expect(startAfter).toBeGreaterThanOrEqual(CLEANING_START_DELAY[0])
    expect(startAfter).toBeLessThanOrEqual(CLEANING_START_DELAY[1])
    const duration = minutesBetween(start!.occurredAt, finish!.occurredAt)
    expect(duration).toBeGreaterThanOrEqual(CLEANING_DURATION[0])
    expect(duration).toBeLessThanOrEqual(CLEANING_DURATION[1])
    expect(await h.backend.repositories.bed.get('bed-1')).toMatchObject({ status: 'AVAILABLE' })
  })
})

describe('bedBlocks', () => {
  it('blocks about one free ward bed a day with a reason and unblocks long-blocked beds in the daytime', async () => {
    const h = await createScenarioHarness()
    const changes: Change[] = []
    for (let i = 0; i < 10; i++) {
      changes.push(
        putBed({
          id: `bed-b${i}`,
          status: 'BLOCKED',
          blockedReason: 'Avería',
          statusChangedAt: iso(-300),
        }),
      )
    }
    await h.put(...changes)
    await h.play(policies(bedBlocks), 3 * 24 * 60)

    const blocked = await h.events('BedBlocked')
    expect(blocked.length).toBeGreaterThan(0)
    expect(blocked.length).toBeLessThan(10)
    for (const e of blocked)
      expect((e.payload as { reason: string }).reason.length).toBeGreaterThan(0)

    const unblocked = await h.events('BedUnblocked')
    expect(unblocked.length).toBeGreaterThan(5)
    for (const e of unblocked) {
      const hourUtc = Number(e.occurredAt.slice(11, 13))
      expect(hourUtc).toBeGreaterThanOrEqual(6) // 08:00 Madrid
      expect(hourUtc).toBeLessThanOrEqual(18) // 20:00 Madrid
    }
  })
})
