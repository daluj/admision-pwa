import type { DataBackend } from '@/data/ports'
import type { Command } from '@/domain/commands'
import type { HospitalEvent, IsoDateTime } from '@/domain/schemas'
import type { Rng } from '@/simulator/random/prng'

export type SimulationBackend = Pick<DataBackend, 'repositories' | 'events'>

/** What a scenario sees while processing one simulated minute. */
export type MinuteContext = {
  backend: SimulationBackend
  seed: number
  /** The simulated minute being processed (whole minute, ISO UTC). Used as the event time. */
  at: IsoDateTime
  /** Minutes since the Unix epoch; `at` expressed as an integer. */
  minuteIndex: number
  /** Independent random stream for this minute and `label` — same seed + minute + label ⇒ same draws. */
  rng: (label: string) => Rng
  /**
   * Runs a domain command at `at`. A rejected command (invalid transition, unknown id…) is logged
   * with `console.warn` and returns `null` — the runner never crashes on a policy mistake.
   */
  exec: <Input>(command: Command<Input>, input: Input) => Promise<HospitalEvent[] | null>
}

/** A scenario decides, minute by minute, what happens in the hospital. */
export type Scenario = {
  id: string
  step: (ctx: MinuteContext) => Promise<void>
}
