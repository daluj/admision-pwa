import { ArrowLeft, Route } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
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
  const q = params.get('q')
  const back = q ? `/seguimiento?q=${encodeURIComponent(q)}` : '/seguimiento'

  const hrefFor = (episodeId: string) => {
    const next = new URLSearchParams(params)
    next.set('episodio', episodeId)
    return `/seguimiento/${patientId}?${next.toString()}`
  }

  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      <p className="mb-4">
        <Link to={back} className="inline-flex items-center gap-1 text-sm hover:underline">
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
