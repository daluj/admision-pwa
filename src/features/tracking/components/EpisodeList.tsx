import { Link } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { JourneyEpisode } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatRelativeDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import { statusText } from './statusText'

const copy = es.pages.tracking.journey.episodes

/** All the patient's episodes; the selected one is the timeline above. Shown only when there are several. */
export function EpisodeList({
  episodes,
  selectedId,
  now,
  hrefFor,
  state,
}: {
  episodes: readonly JourneyEpisode[]
  selectedId: string
  now: string
  hrefFor: (episodeId: string) => string
  /** Router state carried to the episode page (the search to go back to). */
  state?: unknown
}) {
  if (episodes.length < 2) return null
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{copy.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul aria-label={copy.title} className="divide-y text-sm">
          {episodes.map((episode) => {
            const label = `${copy.kind[episode.kind]} · ${formatRelativeDay(episode.startedAt, now)}`
            const selected = episode.id === selectedId
            return (
              <li key={episode.id} data-episode={episode.id} className="py-2">
                <Link
                  to={hrefFor(episode.id)}
                  state={state}
                  aria-current={selected ? 'true' : undefined}
                  aria-label={copy.open(`${label} · ${statusText(episode)}`)}
                  className={cn(
                    'flex flex-wrap justify-between gap-2 hover:underline',
                    selected && 'font-semibold',
                  )}
                >
                  <span>{label}</span>
                  <span className="text-muted-foreground">
                    {statusText(episode)}
                    {selected && ` · ${copy.selected}`}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
