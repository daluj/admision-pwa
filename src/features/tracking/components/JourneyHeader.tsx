import { Card, CardContent } from '@/components/ui/card'
import type { Journey, JourneyEpisode } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration } from '@/lib/format'
import { locationText, statusText } from './statusText'

const copy = es.pages.tracking.journey

/** Who the patient is and where they are right now. This is the screen that shows the full name and NHC. */
export function JourneyHeader({
  journey,
  episode,
}: {
  journey: Journey
  episode?: JourneyEpisode
}) {
  const { patient } = journey
  return (
    <Card className="mb-6">
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">
            {patient.firstName} {patient.lastName}
          </h2>
          <p className="text-muted-foreground text-sm tabular-nums">
            {patient.mrn} · {copy.age(journey.ageYears)} · {copy.sex[patient.sex]}
          </p>
        </div>
        {episode && (
          <dl className="grid gap-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-muted-foreground">{copy.location.label}:</dt>
              <dd className="font-medium">{locationText(episode.location)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">{copy.statusLabel}:</dt>
              <dd className="font-medium">
                {statusText(episode)}
                {episode.active && episode.sinceMs !== undefined && (
                  <span className="text-muted-foreground font-normal">
                    {' · '}
                    {copy.inStatus(formatDuration(episode.sinceMs))}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
