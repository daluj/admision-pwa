import { LayoutDashboard } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { useVisibleAlerts } from '@/features/alerts/useVisibleAlerts'
import { es } from '@/i18n/es'
import { OpenAlerts } from './components/OpenAlerts'
import { OverviewKpis } from './components/OverviewKpis'
import { StatusCard } from './components/StatusCard'
import { useOverview } from './useOverview'

const copy = es.pages.overview
// Recharts stays out of the landing chunk.
const OverviewCharts = lazy(() => import('./components/OverviewCharts'))

/** `/`: status level → KPIs of every area → open alerts → 24 h trends. */
export default function OverviewPage() {
  const result = useOverview()
  const alerts = useVisibleAlerts()

  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      {!result || !alerts ? (
        <p role="status" aria-busy="true" className="text-muted-foreground text-sm">
          {copy.loading}
        </p>
      ) : result.overview.census.counts.total === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      ) : (
        <>
          <StatusCard status={result.overview.status} />
          <OverviewKpis
            overview={result.overview}
            alerts={{ unacknowledged: alerts.unacknowledged, open: alerts.open.length }}
          />
          <OpenAlerts alerts={alerts.open} />
          <Suspense
            fallback={
              <p role="status" className="text-muted-foreground mb-6 text-sm">
                {copy.charts.loading}
              </p>
            }
          >
            <OverviewCharts edHourly={result.overview.edHourly} flow={result.overview.flow} />
          </Suspense>
        </>
      )}
    </>
  )
}
