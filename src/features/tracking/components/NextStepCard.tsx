import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { JourneyEpisode } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatRelativeDay } from '@/lib/format'

const copy = es.pages.tracking.journey

/** The next expected step and its ETA when the data has one. */
export function NextStepCard({ episode, now }: { episode: JourneyEpisode; now: string }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{copy.next.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {episode.next ? (
          <>
            <p className="font-medium">{copy.steps[episode.next.kind]}</p>
            <p className="text-muted-foreground">
              {episode.next.expectedAt
                ? copy.next.eta(formatRelativeDay(episode.next.expectedAt, now))
                : copy.next.noEta}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">{copy.next.none}</p>
        )}
      </CardContent>
    </Card>
  )
}
