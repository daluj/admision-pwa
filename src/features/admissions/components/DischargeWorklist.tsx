import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { worklistTab, type WorklistRow, type WorklistTab } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration, formatRelativeDay } from '@/lib/format'
import { cn } from '@/lib/utils'

const copy = es.pages.admissions.worklist
const TABS: readonly WorklistTab[] = ['today', 'ordered', 'upcoming', 'none']
export const WORKLIST_PAGE_SIZE = 50

type DischargeWorklistProps = {
  rows: readonly WorklistRow[]
  now: string
  /** Whether the current user may act on this patient (their unit, their role). */
  canAct: (row: WorklistRow) => boolean
  onEdit: (row: WorklistRow) => void
  onOrder: (row: WorklistRow) => void
}

/** Inpatients grouped by discharge status, with the discharge actions. Presentational. */
export function DischargeWorklist({ rows, now, canAct, onEdit, onOrder }: DischargeWorklistProps) {
  const [tab, setTab] = useState<WorklistTab>('today')
  const [limit, setLimit] = useState(WORKLIST_PAGE_SIZE)
  const shown = worklistTab(rows, tab)
  const visible = shown.slice(0, limit)

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
        <div role="tablist" aria-label={copy.title} className="mt-2 flex flex-wrap gap-2">
          {TABS.map((id) => (
            <button
              key={id}
              role="tab"
              type="button"
              id={`worklist-tab-${id}`}
              aria-selected={tab === id}
              aria-controls="worklist-panel"
              tabIndex={tab === id ? 0 : -1}
              onKeyDown={(event) => {
                const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
                if (step === 0) return
                event.preventDefault()
                const next = TABS[(TABS.indexOf(id) + step + TABS.length) % TABS.length]!
                setTab(next)
                setLimit(WORKLIST_PAGE_SIZE)
                document.getElementById(`worklist-tab-${next}`)?.focus()
              }}
              onClick={() => {
                setTab(id)
                setLimit(WORKLIST_PAGE_SIZE)
              }}
              className={cn(
                'focus-visible:ring-ring rounded-full border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none',
                tab === id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-accent',
              )}
            >
              {copy.tabs[id]} <span className="tabular-nums">({worklistTab(rows, id).length})</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent role="tabpanel" id="worklist-panel" aria-labelledby={`worklist-tab-${tab}`}>
        {visible.length === 0 ? (
          <p className="text-muted-foreground text-sm">{copy.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{copy.tabs[tab]}</caption>
              <thead className="text-muted-foreground border-b text-xs">
                <tr>
                  {(['bed', 'patient', 'service', 'stay', 'expected', 'actions'] as const).map(
                    (key) => (
                      <th key={key} scope="col" className="py-2 pr-3 font-medium">
                        {copy.columns[key]}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((row) => {
                  const editable = !row.ordered && canAct(row)
                  const label = `${row.bed.label} · ${row.initials}`
                  return (
                    <tr key={row.admission.id} data-admission={row.admission.id} data-tab={row.tab}>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span className="font-medium tabular-nums">{row.bed.label}</span>
                        <span className="text-muted-foreground block text-xs">{row.unit.name}</span>
                      </td>
                      <td className="py-2 pr-3 font-medium tabular-nums">{row.initials}</td>
                      <td className="py-2 pr-3">{row.specialtyName}</td>
                      <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                        {formatDuration(row.losMs)}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {row.ordered ? (
                          <span className="font-medium">{copy.ordered}</span>
                        ) : row.expectedDischargeAt ? (
                          <>
                            {formatRelativeDay(row.expectedDischargeAt, now)}
                            {row.overdue && (
                              <span className="bg-status-warn text-status-warn-foreground ml-2 rounded px-1 text-xs font-medium">
                                {copy.overdue}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">{copy.none}</span>
                        )}
                      </td>
                      <td className="py-2 whitespace-nowrap">
                        {editable ? (
                          <span className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onEdit(row)}
                              aria-label={`${row.expectedDischargeAt ? copy.editExisting : copy.edit}: ${label}`}
                            >
                              {row.expectedDischargeAt ? copy.editExisting : copy.edit}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => onOrder(row)}
                              aria-label={`${copy.order}: ${label}`}
                            >
                              {copy.order}
                            </Button>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {row.ordered ? '' : copy.readOnly}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {shown.length > visible.length && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setLimit((n) => n + WORKLIST_PAGE_SIZE)}
          >
            {copy.showMore(shown.length - visible.length)}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
