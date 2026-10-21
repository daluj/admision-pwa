import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type TrendPoint = {
  /** X-axis label ("14:00"). */
  label: string
  /** `null` leaves a gap (no data for that point). */
  value: number | null
  /** Extra tooltip line ("12 de 14 dentro de objetivo"). */
  detail?: string
}

type TrendChartProps = {
  title: string
  description?: string
  points: readonly TrendPoint[]
  seriesName: string
  /** Dashed reference line (a target or objective). */
  reference?: { value: number; label: string }
  /** Y axis range (default 0–100). */
  domain?: readonly [number, number]
  formatValue: (value: number) => string
  /** Text alternative: the same numbers as a table, visually hidden. */
  table: { headers: readonly string[]; rows: readonly (readonly string[])[] }
  height?: number
}

type TipProps = {
  active?: boolean
  payload?: ReadonlyArray<{ payload: TrendPoint }>
  formatValue: (value: number) => string
  seriesName: string
  noData: string
}

function Tip({ active, payload, formatValue, seriesName, noData }: TipProps) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{point.label}</p>
      <p>
        {seriesName}: {point.value === null ? noData : formatValue(point.value)}
      </p>
      {point.detail && <p className="text-muted-foreground">{point.detail}</p>}
    </div>
  )
}

/**
 * Line chart over time with an optional reference line. Colours come from the theme tokens, gaps
 * stay gaps, no redraw animation (it updates live and must stay calm; also honours `prefers-reduced-motion`), and a visually hidden table carries the
 * same numbers for screen readers.
 */
export function TrendChart({
  title,
  description,
  points,
  seriesName,
  reference,
  domain = [0, 100],
  formatValue,
  table,
  height = 240,
  noData = '—',
}: TrendChartProps & { noData?: string }) {
  return (
    <figure aria-label={title} className="m-0">
      <figcaption className="sr-only">
        {title}
        {description ? `. ${description}` : ''}
      </figcaption>
      <div aria-hidden="true" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height }}>
          <LineChart data={[...points]} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={24}
              stroke="var(--border)"
            />
            <YAxis
              domain={[...domain]}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              tickFormatter={(v: number) => formatValue(v)}
              width={44}
              stroke="var(--border)"
            />
            <Tooltip
              content={<Tip formatValue={formatValue} seriesName={seriesName} noData={noData} />}
            />
            {reference && (
              <ReferenceLine
                y={reference.value}
                stroke="var(--status-neutral)"
                strokeDasharray="6 4"
                label={{
                  value: reference.label,
                  position: 'insideTopRight',
                  fill: 'var(--muted-foreground)',
                  fontSize: 11,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              name={seriesName}
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--primary)' }}
              connectNulls={false}
              // Live data: a redraw animation on every update would be noise on a wall display.
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            {table.headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
