import type { BedView } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { BedTile } from './BedTile'

const copy = es.pages.beds.unit

/** "512-A" → room "512"; labels without a dash are their own room. */
export const roomOf = (label: string): string => label.split('-')[0] ?? label

export function groupByRoom(views: readonly BedView[]): Array<{ room: string; beds: BedView[] }> {
  const rooms = new Map<string, BedView[]>()
  for (const view of views) {
    const room = roomOf(view.bed.label)
    rooms.set(room, [...(rooms.get(room) ?? []), view])
  }
  return [...rooms.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es', { numeric: true }))
    .map(([room, beds]) => ({ room, beds }))
}

export function BedMap({ views, now }: { views: readonly BedView[]; now: string }) {
  return (
    <section aria-labelledby="bed-map-title">
      <h2 id="bed-map-title" className="mb-3 text-lg font-semibold">
        {copy.mapTitle}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groupByRoom(views).map(({ room, beds }) => (
          <li key={room} className="bg-muted/40 rounded-lg border p-2">
            <h3 className="text-muted-foreground mb-2 text-xs font-medium">{copy.room(room)}</h3>
            <div className="grid grid-cols-2 gap-2">
              {beds.map((view) => (
                <BedTile key={view.bed.id} view={view} now={now} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
