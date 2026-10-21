import {
  DEFAULT_ALERT_CONFIG,
  parseAlertConfig,
  validateAlertConfig,
  type AlertConfig,
} from '@/domain/alerts'

export const ALERT_CONFIG_STORAGE_KEY = 'torre-control.alert-config'
const CHANGED = 'torre-control:alert-config'

let cache: { raw: string | null; value: AlertConfig } | null = null

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(ALERT_CONFIG_STORAGE_KEY)
  } catch {
    return null
  }
}

/** The stored thresholds (defaults when nothing valid is stored). The same object while unchanged. */
export function readAlertConfig(): AlertConfig {
  const raw = readRaw()
  if (cache && cache.raw === raw) return cache.value
  let value = DEFAULT_ALERT_CONFIG
  if (raw !== null) {
    try {
      value = parseAlertConfig(JSON.parse(raw))
    } catch {
      value = DEFAULT_ALERT_CONFIG
    }
  }
  cache = { raw, value }
  return value
}

/** Saves a valid config; returns false (and stores nothing) when it does not validate. */
export function writeAlertConfig(config: AlertConfig): boolean {
  if (Object.keys(validateAlertConfig(config)).length > 0) return false
  try {
    window.localStorage.setItem(ALERT_CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    return false
  }
  window.dispatchEvent(new Event(CHANGED))
  return true
}

export function resetAlertConfig(): void {
  try {
    window.localStorage.removeItem(ALERT_CONFIG_STORAGE_KEY)
  } catch {
    // Nothing stored, nothing to reset.
  }
  window.dispatchEvent(new Event(CHANGED))
}

/** Subscribes to changes in this tab (custom event) and in other tabs (`storage`). */
export function subscribeAlertConfig(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ALERT_CONFIG_STORAGE_KEY) onChange()
  }
  window.addEventListener(CHANGED, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGED, onChange)
    window.removeEventListener('storage', onStorage)
  }
}
