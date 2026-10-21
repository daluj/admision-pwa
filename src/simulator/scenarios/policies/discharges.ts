import { dischargePatient, orderDischarge, setExpectedDischarge } from '@/domain/commands'
import { addMinutes, HOSPITAL_TIME_ZONE, zonedDayAt } from '@/lib/time'
import {
  DISCHARGE_DELAY_AFTER_ORDER,
  DISCHARGE_HOURS,
  DISCHARGE_ORDER_LEAD,
  EXPECTED_DAYS_AHEAD,
  EXPECTED_HOURS,
  EXPECTED_SET_DAILY_SHARE,
  EXPECTED_SET_SLOT_HOURS,
  MAX_DISCHARGE_ACTIONS_PER_MINUTE,
  ORDER_HOURS,
} from '../normalDay.config'
import { scaleRange } from '../tuning'
import { entityChance, entityInt, entitySlot, minutesBetween } from '../entityRandom'
import { inHours, type LocalTime } from '../localTime'
import type { MinuteContext } from '../types'
import { sortedById, type World } from '../world'

/**
 * Units set expected discharges, physicians order them shortly before (some slip a day), and the
 * patient leaves during daytime. Discharge actions per minute are capped (ward workload).
 */
export async function discharges(
  ctx: MinuteContext,
  world: World,
  local: LocalTime,
): Promise<void> {
  const { seed, at } = ctx
  let actions = 0

  for (const admission of sortedById(world.admissions)) {
    if (actions >= MAX_DISCHARGE_ACTIONS_PER_MINUTE) return

    if (admission.status === 'ADMITTED') {
      const expected = admission.expectedDischargeAt
      if (!expected) {
        const slot = entitySlot(seed, 'expected-slot', admission.id, EXPECTED_SET_SLOT_HOURS)
        if (
          local.minuteOfDay === slot &&
          entityChance(seed, `expected:${local.date}`, admission.id, EXPECTED_SET_DAILY_SHARE)
        ) {
          const days = entityInt(
            seed,
            `expected-days:${local.date}`,
            admission.id,
            EXPECTED_DAYS_AHEAD,
          )
          const hour = entityInt(seed, `expected-hour:${local.date}`, admission.id, EXPECTED_HOURS)
          await ctx.exec(setExpectedDischarge, {
            admissionId: admission.id,
            expectedDischargeAt: zonedDayAt(addMinutes(at, days * 1440), HOSPITAL_TIME_ZONE, hour),
          })
          actions++
        }
        continue
      }
      const lead = entityInt(seed, `order-lead:${expected}`, admission.id, DISCHARGE_ORDER_LEAD)
      if (minutesBetween(at, expected) > lead || !inHours(local, ORDER_HOURS)) continue
      actions++
      if (entityChance(seed, `slip:${expected}`, admission.id, ctx.tuning.dischargeSlipShare)) {
        // A day later — and still ahead of now, however overdue it already was.
        let next = addMinutes(expected, 1440)
        while (Date.parse(next) <= Date.parse(at)) next = addMinutes(next, 1440)
        await ctx.exec(setExpectedDischarge, {
          admissionId: admission.id,
          expectedDischargeAt: next,
        })
      } else {
        await ctx.exec(orderDischarge, { admissionId: admission.id })
      }
    } else if (admission.status === 'DISCHARGE_ORDERED' && admission.dischargeOrderedAt) {
      const wait = entityInt(
        seed,
        'discharge-delay',
        admission.id,
        scaleRange(DISCHARGE_DELAY_AFTER_ORDER, ctx.tuning.dischargeDelayFactor),
      )
      if (
        minutesBetween(admission.dischargeOrderedAt, at) >= wait &&
        inHours(local, DISCHARGE_HOURS)
      ) {
        actions++
        await ctx.exec(dischargePatient, { admissionId: admission.id })
      }
    }
  }
}
