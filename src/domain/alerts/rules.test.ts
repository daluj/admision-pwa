import { describe, expect, it } from 'vitest'
import { alertInput, ALERT_NOW } from '@/test/alertsFixture'
import { DEFAULT_ALERT_CONFIG, type AlertConfig } from './config'
import { alertCandidates, balanceCandidates, type AlertCandidate, type AlertRuleId } from './rules'

const compute = (config: AlertConfig = DEFAULT_ALERT_CONFIG, input = alertInput) =>
  alertCandidates(input, config)
const of = (list: AlertCandidate[], rule: AlertRuleId) =>
  list
    .filter((c) => c.ruleId === rule)
    .map((c) => `${c.entityId}:${c.severity}`)
    .sort()

describe('alertCandidates', () => {
  it('ED triage breach: critical for L1–2, warning for L3–5; the waits stay out of the params', () => {
    const list = compute()
    expect(of(list, 'ED_TRIAGE_TARGET_BREACH')).toEqual([
      'v3:CRITICAL',
      'v5:WARNING',
      'v6:CRITICAL',
    ])
    const v5 = list.find((c) => c.entityId === 'v5')!
    expect(v5).toMatchObject({
      key: 'ED_TRIAGE_TARGET_BREACH:v5',
      entityType: 'EdVisit',
      params: { level: 4, targetMin: 120 },
    })
    expect(Object.keys(v5.params).sort()).toEqual(['initials', 'level', 'targetMin'])
  })

  it('boarding long: warning past 4 h, critical past 8 h, strictly', () => {
    expect(of(compute(), 'BOARDING_LONG')).toEqual(['v8:WARNING', 'v9:CRITICAL'])
    const at = (minutes: number) => {
      const visits = alertInput.edVisits.map((v) =>
        v.id === 'v8'
          ? {
              ...v,
              admitDecisionAt: new Date(Date.parse(ALERT_NOW) - minutes * 60_000).toISOString(),
            }
          : v,
      )
      return of(
        compute(DEFAULT_ALERT_CONFIG, { ...alertInput, edVisits: visits }),
        'BOARDING_LONG',
      ).filter((x) => x.startsWith('v8'))
    }
    expect(at(240)).toEqual([]) // exactly 4 h
    expect(at(241)).toEqual(['v8:WARNING'])
    expect(at(480)).toEqual(['v8:WARNING']) // exactly 8 h
    expect(at(481)).toEqual(['v8:CRITICAL'])
  })

  it('boarding thresholds come from the config', () => {
    const strict = {
      ...DEFAULT_ALERT_CONFIG,
      boardingLongWarnHours: 0.5,
      boardingLongCriticalHours: 6,
    }
    expect(of(compute(strict), 'BOARDING_LONG')).toEqual([
      'v10:WARNING',
      'v8:WARNING',
      'v9:CRITICAL',
    ])
  })

  it('pending cleaning: strictly over 60 min warns, over 120 min is critical', () => {
    expect(of(compute(), 'BED_PENDING_CLEANING_LONG')).toEqual(['bc1:WARNING', 'bc3:CRITICAL'])
    const bc1 = compute().find((c) => c.entityId === 'bc1')!
    expect(bc1.params).toEqual({ bedLabel: 'BC1', unitName: 'Cardiología 5ª Norte', unitId: 'u1' })
    const relaxed = {
      ...DEFAULT_ALERT_CONFIG,
      pendingCleaningWarnMin: 90,
      pendingCleaningCriticalMin: 200,
    }
    expect(of(compute(relaxed), 'BED_PENDING_CLEANING_LONG')).toEqual(['bc3:WARNING'])
  })

  it('transfer SLA: urgent is critical, normal a warning, with initials and destination', () => {
    const list = compute()
    expect(of(list, 'TRANSFER_SLA_BREACH')).toEqual(['t1:CRITICAL'])
    expect(list.find((c) => c.entityId === 't1')).toMatchObject({
      entityType: 'TransferRequest',
      params: { to: 'Planta 1 t1' },
    })
    const normalLate = alertInput.transfers.map((t) =>
      t.id === 't2'
        ? { ...t, slaDueAt: new Date(Date.parse(ALERT_NOW) - 60_000).toISOString() }
        : t,
    )
    expect(
      of(
        compute(DEFAULT_ALERT_CONFIG, { ...alertInput, transfers: normalLate }),
        'TRANSFER_SLA_BREACH',
      ),
    ).toEqual(['t1:CRITICAL', 't2:WARNING'])
  })

  it('unit full: no free bed and open requests for its specialty and type', () => {
    const list = compute()
    expect(of(list, 'UNIT_FULL')).toEqual(['u9:WARNING'])
    expect(list.find((c) => c.ruleId === 'UNIT_FULL')!.params).toMatchObject({
      unitId: 'u9',
      requests: 1,
    })
    // Without the open request the unit is full but nobody is waiting.
    const noRequest = alertInput.bedRequests.map((r) =>
      r.id === 'r9' ? { ...r, status: 'CANCELLED' as const } : r,
    )
    expect(
      of(compute(DEFAULT_ALERT_CONFIG, { ...alertInput, bedRequests: noRequest }), 'UNIT_FULL'),
    ).toEqual([])
  })

  it('every candidate has a unique key', () => {
    const keys = compute().map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('balanceCandidates', () => {
  it('is silent at 0 or more, a warning below 0 and critical below the configured value', () => {
    expect(balanceCandidates(0, DEFAULT_ALERT_CONFIG)).toEqual([])
    expect(balanceCandidates(3, DEFAULT_ALERT_CONFIG)).toEqual([])
    expect(balanceCandidates(-1, DEFAULT_ALERT_CONFIG)[0]).toMatchObject({
      ruleId: 'BED_BALANCE_NEGATIVE',
      severity: 'WARNING',
      entityType: 'SimulationState',
      entityId: 'current',
      params: { value: -1 },
    })
    expect(balanceCandidates(-10, DEFAULT_ALERT_CONFIG)[0]!.severity).toBe('WARNING') // exactly −10
    expect(balanceCandidates(-11, DEFAULT_ALERT_CONFIG)[0]!.severity).toBe('CRITICAL')
    expect(
      balanceCandidates(-6, { ...DEFAULT_ALERT_CONFIG, balanceCritical: -5 })[0]!.severity,
    ).toBe('CRITICAL')
  })
})
