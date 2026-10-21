import { useSyncExternalStore } from 'react'
import type { AlertConfig } from '@/domain/alerts'
import { readAlertConfig, subscribeAlertConfig } from './alertConfigStore'

/** The current thresholds, live across tabs. */
export function useAlertConfig(): AlertConfig {
  return useSyncExternalStore(subscribeAlertConfig, readAlertConfig, readAlertConfig)
}
