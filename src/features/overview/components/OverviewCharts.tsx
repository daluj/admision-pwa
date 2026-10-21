import { TrendChart, type TrendPoint } from '@/components/dashboard/TrendChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ED_THRESHOLDS } from '@/domain/kpis'
import type { FlowBucket } from '@/domain/alerts'
import type { HourBucket } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { HOSPITAL_TIME_ZONE } from '@/lib/time'

const copy = es.pages.overview.charts
const edCopy = es.pages.emergency.chart

const hourFormatter = new Intl.DateTimeFormat('es-ES', {
  timeZone: HOSPITAL_TIME_ZONE,
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
})
const hourLabel = (iso: string) => hourFormatter.format(Date.parse(iso))
const percent = (value: number) => `${Math.round(value)} %`

function flowPoints(flow: readonly FlowBucket[], field: 'admitted' | 'discharged'): TrendPoint[] {
  return flow.map((b) => ({
    label: hourLabel(b.start),
    value: b[field],
    ...(b.partial ? { detail: copy.partial } : {}),
  }))
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <h3>{title}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** 24 h trends: % seen within target (ED) and admissions / discharges per hour. Loaded lazily (Recharts). */
export default function OverviewCharts({
  edHourly,
  flow,
}: {
  edHourly: readonly HourBucket[]
  flow: readonly FlowBucket[]
}) {
  const edPoints: TrendPoint[] = edHourly.map((b) => ({
    label: hourLabel(b.start),
    value: b.pct === null ? null : b.pct * 100,
    ...(b.seen > 0 ? { detail: edCopy.point(b.within, b.seen) } : {}),
  }))
  const max = Math.max(4, ...flow.map((b) => Math.max(b.admitted, b.discharged)))
  const flowChart = (field: 'admitted' | 'discharged') => {
    const meta = copy[field]
    return (
      <Panel title={meta.title}>
        <TrendChart
          title={meta.title}
          description={meta.description}
          points={flowPoints(flow, field)}
          seriesName={meta.seriesName}
          domain={[0, max]}
          formatValue={(v) => copy.count(v)}
          table={{
            headers: [copy.hour, copy.value],
            rows: flow.map((b) => [hourLabel(b.start), String(b[field])]),
          }}
          height={200}
        />
      </Panel>
    )
  }
  return (
    <section aria-label={copy.title} className="mb-6 grid gap-4 lg:grid-cols-3">
      <Panel title={edCopy.title}>
        <TrendChart
          title={edCopy.title}
          description={edCopy.description}
          points={edPoints}
          seriesName={edCopy.seriesName}
          reference={{
            value: ED_THRESHOLDS.withinTargetObjective * 100,
            label: edCopy.objective(Math.round(ED_THRESHOLDS.withinTargetObjective * 100)),
          }}
          formatValue={percent}
          table={{
            headers: [copy.hour, edCopy.seriesName],
            rows: edHourly.map((b) => [
              hourLabel(b.start),
              b.pct === null ? '—' : percent(b.pct * 100),
            ]),
          }}
          height={200}
        />
      </Panel>
      {flowChart('admitted')}
      {flowChart('discharged')}
    </section>
  )
}
