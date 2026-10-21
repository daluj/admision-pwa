import { ArrowLeft, Route } from 'lucide-react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { es } from '@/i18n/es'
import { EpisodeList } from './components/EpisodeList'
import { JourneyHeader } from './components/JourneyHeader'
import { JourneyTimeline } from './components/JourneyTimeline'
import { NextStepCard } from './components/NextStepCard'
import { useJourney } from './useJourneyData'

const copy = es.pages.tracking

/** `/seguimiento/:patientId`: header → next step → timeline → other episodes. */
export default function JourneyPage() {
  const { patientId = '' } = useParams()
  const [params] = useSearchParams()
  const state = useJourney(patientId)
  const location = useLocation()
  // Carried in router state so that "back" restores the search without putting it in the URL.
  const q = (location.state as { q?: string } | null)?.q

  const hrefFor = (episodeId: string) =>
    `/seguimiento/${patientId}?episodio=${encodeURIComponent(episodeId)}`

  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      <p className="mb-4">
        <Link
          to="/seguimiento"
          state={q ? { q } : null}
          className="inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {copy.journey.back}
        </Link>
      </p>
      {state.status === 'loading' ? (
        <p role="status" aria-busy="true" className="text-muted-foreground text-sm">
          {copy.loading}
        </p>
      ) : state.status === 'notFound' ? (
        <EmptyState
          icon={Route}
          title={copy.journey.notFound.title}
          description={copy.journey.notFound.description}
        />
      ) : (
        (() => {
          const { journey, now } = state
          const wanted = params.get('episodio')
          const episode = journey.episodes.find((e) => e.id === wanted) ?? journey.episodes[0]
          return (
            <>
              <JourneyHeader journey={journey} {...(episode ? { episode } : {})} />
              {episode ? (
                <>
                  {episode.active && <NextStepCard episode={episode} now={now} />}
                  <JourneyTimeline steps={episode.steps} now={now} />
                  <EpisodeList
                    episodes={journey.episodes}
                    selectedId={episode.id}
                    now={now}
                    hrefFor={hrefFor}
                    state={q ? { q } : null}
                  />
                </>
              ) : (
                <p className="text-muted-foreground text-sm">{copy.journey.noEpisodes}</p>
              )}
            </>
          )
        })()
      )}
    </>
  )
}
