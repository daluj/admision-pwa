import { ScrollText } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ENTITY_TYPES, type HospitalEvent } from '@/domain/schemas'
import { EVENT_TYPES } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { formatDateTime } from '@/lib/time'
import {
  DEFAULT_FILTERS,
  eventSummary,
  filterEvents,
  WINDOWS,
  type EventLogFilters,
} from '../eventLog'

const copy = es.pages.settings.eventLog

type EventLogCardProps = {
  /** Newest first; `undefined` while loading. */
  events: HospitalEvent[] | undefined
  /** Simulated time, the end of the time window. */
  simNow: string | undefined
  /** More events may exist beyond the loaded ones. */
  canLoadMore: boolean
  onLoadMore: () => void
}

const SELECT_CLASS = 'border-input bg-background h-9 rounded-md border px-2 text-sm'

/** Presentational: filters + table of the latest events. */
export function EventLogCard({ events, simNow, canLoadMore, onLoadMore }: EventLogCardProps) {
  const ids = { type: useId(), entity: useId(), window: useId() }
  const [filters, setFilters] = useState<EventLogFilters>(DEFAULT_FILTERS)
  const visible = useMemo(
    () => (events ? filterEvents(events, filters, simNow) : []),
    [events, filters, simNow],
  )
  const set = <K extends keyof EventLogFilters>(key: K, value: EventLogFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="text-muted-foreground size-5" aria-hidden="true" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div role="group" aria-label={copy.filters} className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.type}>{copy.type}</Label>
            <select
              id={ids.type}
              className={SELECT_CLASS}
              value={filters.type}
              onChange={(e) => set('type', e.target.value as EventLogFilters['type'])}
            >
              <option value="all">{copy.all}</option>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {copy.types[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.entity}>{copy.entity}</Label>
            <select
              id={ids.entity}
              className={SELECT_CLASS}
              value={filters.entity}
              onChange={(e) => set('entity', e.target.value as EventLogFilters['entity'])}
            >
              <option value="all">{copy.all}</option>
              {ENTITY_TYPES.map((entity) => (
                <option key={entity} value={entity}>
                  {copy.entities[entity]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.window}>{copy.window}</Label>
            <select
              id={ids.window}
              className={SELECT_CLASS}
              value={filters.window}
              onChange={(e) => set('window', e.target.value as EventLogFilters['window'])}
            >
              {WINDOWS.map((window) => (
                <option key={window} value={window}>
                  {copy.windows[window]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {events === undefined ? (
          <p className="text-muted-foreground text-sm">{copy.loading}</p>
        ) : visible.length === 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
            <p>{copy.empty}</p>
            {events.length === 0 && <p>{copy.emptyHint}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{copy.title}</caption>
              <thead className="text-muted-foreground border-b text-xs">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {copy.columns.seq}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {copy.columns.time}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {copy.columns.type}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {copy.columns.entity}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {copy.columns.actor}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {copy.columns.detail}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((event) => (
                  <tr key={event.seq}>
                    <td className="py-1.5 pr-3 tabular-nums">{event.seq}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">
                      {formatDateTime(event.occurredAt)}
                    </td>
                    <td className="py-1.5 pr-3 font-medium">{copy.types[event.type]}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      {copy.entities[event.entityType]}{' '}
                      <span className="text-muted-foreground tabular-nums">
                        {event.entityId.slice(0, 8)}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3">
                      {event.actor === 'simulator' ? copy.simulator : event.actor.slice(0, 8)}
                    </td>
                    <td className="text-muted-foreground py-1.5">{eventSummary(event)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {events !== undefined && events.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {copy.showing(visible.length, events.length)}
            </p>
            {canLoadMore && (
              <Button variant="outline" size="sm" onClick={onLoadMore}>
                {copy.loadMore}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
