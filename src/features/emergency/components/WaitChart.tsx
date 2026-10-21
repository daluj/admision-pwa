import { TrendChart, type TrendPoint } from '@/components/dashboard/TrendChart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ED_THRESHOLDS, type HourBucket } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { HOSPITAL_TIME_ZONE } from '@/lib/time'

const copy = es.pages.emergency.chart

const hourFormatter = new Intl.DateTimeFormat('es-ES', {
  timeZone: HOSPITAL_TIME_ZONE,
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
})

const percent = (value: number) => `${Math.round(value)} %`

/** "Atendidos en objetivo por hora": % of L2–L5 patients seen within target, last 24 clock hours. */
export function WaitChart({ hourly }: { hourly: readonly HourBucket[] }) {
  const points: TrendPoint[] = hourly.map((bucket) => {
    const detail = [
      bucket.seen > 0 ? copy.point(bucket.within, bucket.seen) : null,
      bucket.partial ? copy.partial : null,
    ].filter(Boolean)
    return {
      label: hourFormatter.format(Date.parse(bucket.start)),
      value: bucket.pct === null ? null : bucket.pct * 100,
      ...(detail.length ? { detail: detail.join(' · ') } : {}),
    }
  })

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <TrendChart
          title={copy.title}
          description={copy.description}
          points={points}
          seriesName={copy.seriesName}
          reference={{
            value: ED_THRESHOLDS.withinTargetObjective * 100,
            label: copy.objective(Math.round(ED_THRESHOLDS.withinTargetObjective * 100)),
          }}
          formatValue={percent}
          noData={copy.noData}
          table={{
            headers: [copy.table.hour, copy.table.seen, copy.table.within, copy.table.pct],
            rows: hourly.map((bucket, i) => [
              bucket.partial ? `${points[i]!.label} (${copy.partial})` : points[i]!.label,
              String(bucket.seen),
              String(bucket.within),
              bucket.pct === null ? copy.noData : percent(bucket.pct * 100),
            ]),
          }}
        />
      </CardContent>
    </Card>
  )
}
