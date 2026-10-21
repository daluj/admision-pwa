import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_ALERT_CONFIG } from '@/domain/alerts'
import {
  ALERT_CONFIG_STORAGE_KEY,
  readAlertConfig,
  resetAlertConfig,
  writeAlertConfig,
} from './alertConfigStore'
import { useAlertConfig } from './useAlertConfig'

beforeEach(() => localStorage.clear())

describe('alert config store', () => {
  it('returns the defaults, as the same object, until something is saved', () => {
    expect(readAlertConfig()).toEqual(DEFAULT_ALERT_CONFIG)
    expect(readAlertConfig()).toBe(readAlertConfig())
  })

  it('saves a valid config and refuses an invalid one without storing it', () => {
    const next = { ...DEFAULT_ALERT_CONFIG, wallRotationSec: 45 }
    expect(writeAlertConfig(next)).toBe(true)
    expect(readAlertConfig().wallRotationSec).toBe(45)
    expect(writeAlertConfig({ ...DEFAULT_ALERT_CONFIG, wallRotationSec: 1 })).toBe(false)
    expect(readAlertConfig().wallRotationSec).toBe(45)
  })

  it('ignores corrupt storage', () => {
    localStorage.setItem(ALERT_CONFIG_STORAGE_KEY, '{nope')
    expect(readAlertConfig()).toEqual(DEFAULT_ALERT_CONFIG)
    localStorage.setItem(ALERT_CONFIG_STORAGE_KEY, JSON.stringify({ boardingLongWarnHours: 99 }))
    expect(readAlertConfig()).toEqual(DEFAULT_ALERT_CONFIG)
  })

  it('reset removes the stored value', () => {
    writeAlertConfig({ ...DEFAULT_ALERT_CONFIG, wallRotationSec: 45 })
    resetAlertConfig()
    expect(localStorage.getItem(ALERT_CONFIG_STORAGE_KEY)).toBeNull()
    expect(readAlertConfig()).toEqual(DEFAULT_ALERT_CONFIG)
  })

  it('the hook follows changes in this tab and from other tabs', () => {
    const { result } = renderHook(() => useAlertConfig())
    expect(result.current.wallRotationSec).toBe(20)
    act(() => void writeAlertConfig({ ...DEFAULT_ALERT_CONFIG, wallRotationSec: 30 }))
    expect(result.current.wallRotationSec).toBe(30)
    act(() => {
      localStorage.setItem(
        ALERT_CONFIG_STORAGE_KEY,
        JSON.stringify({ ...DEFAULT_ALERT_CONFIG, wallRotationSec: 60 }),
      )
      window.dispatchEvent(new StorageEvent('storage', { key: ALERT_CONFIG_STORAGE_KEY }))
    })
    expect(result.current.wallRotationSec).toBe(60)
  })
})
