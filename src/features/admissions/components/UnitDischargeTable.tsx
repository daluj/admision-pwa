import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UnitDischarges } from '@/domain/kpis'
import { es } from '@/i18n/es'

const copy = es.pages.admissions.units

const pct = (value: number | null) => (value === null ? '—' : `${Math.round(value * 100)} %`)

type UnitDischargeTableProps = { rows: readonly UnitDischarges[]; totals: UnitDischarges | null }

/** Expected vs completed discharges and % before 12:00, per unit. Presentational. */
export function UnitDischargeTable({ rows, totals }: UnitDischargeTableProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{copy.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{copy.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{copy.title}</caption>
              <thead className="text-muted-foreground border-b text-xs">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {copy.columns.unit}
                  </th>
                  {(['expected', 'done', 'pending', 'ordered', 'beforeNoon'] as const).map(
                    (key) => (
                      <th key={key} scope="col" className="py-2 pr-3 text-right font-medium">
                        {copy.columns[key]}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.unit.id} data-unit={row.unit.code}>
                    <th scope="row" className="py-2 pr-3 text-left font-medium">
                      {row.unit.name}
                    </th>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.expectedToday}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.doneToday}</td>
                    <td className="py-2 pr-3 text-right font-medium tabular-nums">{row.pending}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.ordered}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{pct(row.pctBeforeNoon)}</td>
                  </tr>
                ))}
              </tbody>
              {totals && rows.length > 1 && (
                <tfoot className="border-t-2 font-semibold">
                  <tr data-unit="total">
                    <th scope="row" className="py-2 pr-3 text-left">
                      {copy.total}
                    </th>
                    <td className="py-2 pr-3 text-right tabular-nums">{totals.expectedToday}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{totals.doneToday}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{totals.pending}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{totals.ordered}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {pct(totals.pctBeforeNoon)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
