import { Wind } from 'lucide-react'
import { Link } from 'react-router'
import { DurationText, TriageBadge } from '@/components/dashboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ED_THRESHOLDS, type BoardingRow, type BoardingState } from '@/domain/kpis'
import { es } from '@/i18n/es'

const copy = es.pages.emergency.boarding
const MINUTE = 60_000

// Strictly past 4 h / 8 h, like the KPI tile and the exceptions.
const TARGET = {
  warnMs: ED_THRESHOLDS.boardingLongWarnMin * MINUTE + 1,
  criticalMs: ED_THRESHOLDS.boardingLongCriticalMin * MINUTE + 1,
}

function stateText(state: BoardingState): string {
  switch (state.kind) {
    case 'NO_BED':
      return copy.states.noBed
    case 'RESERVED':
      return copy.states.reserved(state.bedLabel, state.unitName)
    case 'IN_TRANSFER':
      return copy.states.inTransfer(state.bedLabel)
  }
}

type BoardingTableProps = {
  rows: readonly BoardingRow[]
  now: string
  /** Shows the link to Camas (only for roles that can reserve beds there). */
  canManage: boolean
}

/** Patients with an admit decision waiting for a bed, longest wait first. Presentational. */
export function BoardingTable({ rows, now, canManage }: BoardingTableProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
        {canManage && rows.length > 0 && (
          <div className="mt-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/camas">{copy.manage}</Link>
            </Button>
          </div>
        )}
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
                    {copy.columns.patient}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {copy.columns.service}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {copy.columns.since}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {copy.columns.bed}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.visit.id} data-visit={row.visit.id} data-state={row.state.kind}>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        {row.level && <TriageBadge level={row.level} />}
                        <span className="font-medium tabular-nums">{row.initials}</span>
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {row.specialtyName}
                      <span className="text-muted-foreground">
                        {' · '}
                        {es.pages.beds.unitTypes[row.unitType]}
                      </span>
                      {row.isolationRequired && (
                        <span className="text-status-info ml-2 inline-flex items-center gap-0.5 text-xs font-medium">
                          <Wind className="size-3" aria-hidden="true" />
                          {copy.isolation}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <DurationText from={row.since} now={now} target={TARGET} />
                    </td>
                    <td className="py-2">{stateText(row.state)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
