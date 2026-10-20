import { createFixedClock } from '@/data/adapters/clock/fixedClock'
import { runBackendContract } from '@/data/adapters/contract'
import { createMemoryBackend } from './createMemoryBackend'

runBackendContract('memory', () =>
  createMemoryBackend({ clock: createFixedClock(), validateSchemas: true }),
)
