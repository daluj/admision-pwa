import { registerEdArrival } from '@/domain/commands'
import { createRng } from '@/simulator/random/prng'
import { createPatientFactory } from '@/simulator/seed/generateCensus'
import { COMPLAINTS } from '@/simulator/seed/generateEd'
import { ARRIVALS_PER_HOUR } from '../normalDay.config'
import type { LocalTime } from '../localTime'
import type { MinuteContext } from '../types'
import type { World } from '../world'

/** New ED patients follow an hour-of-day curve (at most one arrival per simulated minute). */
export async function edArrivals(
  ctx: MinuteContext,
  world: World,
  local: LocalTime,
): Promise<void> {
  const rng = ctx.rng('arrival')
  const perHour = (ARRIVALS_PER_HOUR[local.hour] ?? 0) * ctx.tuning.arrivalsMultiplier
  if (!rng.chance(Math.min(1, perHour / 60))) return

  const [complaint, specialty] = rng.pick(COMPLAINTS)
  const used = new Set(world.patients.map((p) => p.mrn))
  const newPatient = createPatientFactory(ctx.rng('arrival-person'), createRng(0), ctx.at, used)
  const patient = newPatient(specialty)
  await ctx.exec(registerEdArrival, {
    patient: {
      data: {
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        sex: patient.sex,
        birthYear: patient.birthYear,
      },
    },
    chiefComplaint: complaint,
  })
}
