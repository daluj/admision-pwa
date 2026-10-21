import { Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { JOURNEY_MIN_QUERY, JOURNEY_SEARCH_LIMIT } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { statusText } from './components/statusText'
import { useJourneySearch } from './useJourneyData'

const copy = es.pages.tracking

/** `/seguimiento`: one search box (NHC or name) and the matching patients with their current situation. */
export default function TrackingPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const search = useJourneySearch(query)
  const searching = query.trim().length >= JOURNEY_MIN_QUERY

  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      <div className="mb-6 max-w-md space-y-1">
        <Label htmlFor="patient-search">{copy.search.label}</Label>
        <Input
          id="patient-search"
          type="search"
          autoComplete="off"
          value={query}
          placeholder={copy.search.placeholder}
          onChange={(event) =>
            setParams(event.target.value ? { q: event.target.value } : {}, { replace: true })
          }
        />
        <p className="text-muted-foreground text-xs">{copy.search.hint}</p>
      </div>
      {!search ? (
        <p role="status" aria-busy="true" className="text-muted-foreground text-sm">
          {copy.loading}
        </p>
      ) : !searching ? (
        <EmptyState icon={Search} title={copy.search.label} description={copy.search.hint} />
      ) : search.results.length === 0 ? (
        <EmptyState
          icon={Search}
          title={search.restricted ? copy.search.noneScoped : copy.search.none}
          description={copy.search.hint}
        />
      ) : (
        <>
          <p className="text-muted-foreground mb-2 text-sm" role="status">
            {copy.search.count(search.results.length, JOURNEY_SEARCH_LIMIT)}
          </p>
          <ul aria-label={copy.search.resultsLabel} className="divide-y rounded-md border">
            {search.results.map(({ patient, initials, episode }) => (
              <li key={patient.id} data-patient={patient.id}>
                <Link
                  to={`/seguimiento/${patient.id}?q=${encodeURIComponent(query)}`}
                  aria-label={copy.search.open(initials)}
                  className="hover:bg-accent flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
                >
                  <span>
                    <span className="font-medium">
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span className="text-muted-foreground ml-2 tabular-nums">{patient.mrn}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {episode ? statusText(episode) : copy.search.noEpisode}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
