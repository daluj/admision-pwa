import { Circle, CircleCheck, CircleDot } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { JourneyStep } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration, formatRelativeDay } from '@/lib/format'
import { cn } from '@/lib/utils'

const copy = es.pages.tracking.journey
const outcomes = es.pages.settings.eventLog.details.outcomes
const cancelReasons = es.pages.settings.eventLog.details.cancelReasons

const STATE_ICON = { done: CircleCheck, current: CircleDot, upcoming: Circle } as const

function detailText(step: JourneyStep): string | null {
  const parts: string[] = []
  if (step.triageLevel) parts.push(copy.triage(step.triageLevel))
  if (step.outcome) parts.push(outcomes[step.outcome])
  if (step.cancelReason) parts.push(cancelReasons[step.cancelReason])
  if (step.bedLabel) parts.push(step.bedLabel)
  return parts.length ? parts.join(' · ') : null
}

function timeText(step: JourneyStep, now: string): string {
  if (step.state === 'done') {
    return step.at ? formatRelativeDay(step.at, now) : copy.timeline.noTime
  }
  return step.expectedAt ? copy.timeline.planned(formatRelativeDay(step.expectedAt, now)) : ''
}

/** The steps of one episode: what happened (with time and duration), what is happening, what is next. */
export function JourneyTimeline({ steps, now }: { steps: readonly JourneyStep[]; now: string }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{copy.timeline.label}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol aria-label={copy.timeline.label} className="space-y-3">
          {steps.map((step) => {
            const Icon = STATE_ICON[step.state]
            const detail = detailText(step)
            const time = timeText(step, now)
            return (
              <li
                key={step.id}
                data-kind={step.kind}
                data-state={step.state}
                aria-current={step.state === 'current' ? 'step' : undefined}
                className={cn(
                  'flex gap-3 text-sm',
                  step.state === 'upcoming' && 'text-muted-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    step.state === 'done' && 'text-status-ok',
                    step.state === 'current' && 'text-status-info',
                  )}
                  aria-hidden="true"
                />
                <div>
                  <p className={cn(step.state !== 'upcoming' && 'font-medium')}>
                    {copy.steps[step.kind]}
                    <span className="text-muted-foreground ml-2 text-xs font-normal">
                      {copy.timeline[step.state]}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {[
                      time,
                      detail,
                      step.state === 'done' && step.sinceMs !== undefined
                        ? copy.timeline.since(formatDuration(step.sinceMs))
                        : null,
                      step.state === 'current' && step.sinceMs !== undefined
                        ? copy.timeline.elapsed(formatDuration(step.sinceMs))
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
