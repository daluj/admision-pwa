import type { Clock } from '@/data/ports'

/** Wall-clock time. The only place in the app that reads the system time. */
export const systemClock: Clock = {
  now: () => new Date().toISOString(),
}
