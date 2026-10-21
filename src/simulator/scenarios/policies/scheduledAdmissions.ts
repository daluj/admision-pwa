import {
  cancelAdmission,
  createScheduledAdmission,
  requestBedForScheduled,
} from '@/domain/commands'
import { createRng } from '@/simulator/random/prng'
import { createPatientFactory } from '@/simulator/seed/generateCensus'
import { HOSPITAL_TIME_ZONE, zonedDayAt } from '@/lib/time'
import {
  SCHEDULE_CREATED_AT_MINUTE,
  SCHEDULED_ARRIVAL_DELAY,
  SCHEDULED_CANCEL_AFTER,
  SCHEDULED_HOURS,
  SCHEDULED_PER_DAY,
  SCHEDULED_SPECIALTIES,
} from '../normalDay.config'
import { entityInt, minutesBetween } from '../entityRandom'
import type { LocalTime } from '../localTime'
import type { MinuteContext } from '../types'
import { sortedById, type World } from '../world'

/**
 * Scheduled admissions: planned at 07:00 for the day, they arrive at their time and ask for a
 * bed like urgent ones; one still without a bed 3 h later is cancelled (`NO_BED`).
 */
export async function scheduledAdmissions(
  ctx: MinuteContext,
  world: World,
  local: LocalTime,
): Promise<void> {
  const { seed, at } = ctx

  if (local.minuteOfDay === SCHEDULE_CREATED_AT_MINUTE) {
    const r = ctx.rng('scheduled')
    const used = new Set(world.patients.map((p) => p.mrn))
    const newPatient = createPatientFactory(ctx.rng('scheduled-people'), createRng(0), at, used)
    for (let i = 0; i < SCHEDULED_PER_DAY; i++) {
      const specialty = r.weighted(SCHEDULED_SPECIALTIES)
      const patient = newPatient(specialty)
      await ctx.exec(createScheduledAdmission, {
        patient: {
          data: {
            mrn: patient.mrn,
            firstName: patient.firstName,
            lastName: patient.lastName,
            sex: patient.sex,
            birthYear: patient.birthYear,
          },
        },
        specialtyCode: specialty,
        scheduledFor: zonedDayAt(
          at,
          HOSPITAL_TIME_ZONE,
          r.int(SCHEDULED_HOURS[0], SCHEDULED_HOURS[1]),
          r.pick([0, 30]),
        ),
      })
    }
  }

  for (const admission of sortedById(world.admissions)) {
    if (admission.type !== 'SCHEDULED' || !admission.scheduledFor) continue
    const late = minutesBetween(admission.scheduledFor, at)
    if (admission.status === 'SCHEDULED') {
      if (late >= entityInt(seed, 'scheduled-arrival', admission.id, SCHEDULED_ARRIVAL_DELAY)) {
        await ctx.exec(requestBedForScheduled, { admissionId: admission.id })
      }
    } else if (admission.status === 'AWAITING_BED' && late >= SCHEDULED_CANCEL_AFTER) {
      await ctx.exec(cancelAdmission, { admissionId: admission.id, reason: 'NO_BED' })
    }
  }
}
