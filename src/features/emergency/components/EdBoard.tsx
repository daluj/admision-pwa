import { BOARD_PHASES, type EdColumns } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { EdCard } from './EdCard'

const copy = es.pages.emergency.board

/** The ED board: one column per phase, cards ordered by triage level then wait. Presentational. */
export function EdBoard({ columns, now }: { columns: EdColumns; now: string }) {
  return (
    <section aria-labelledby="ed-board-title" className="mb-6">
      <h2 id="ed-board-title" className="mb-3 text-lg font-semibold">
        {copy.title}
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {BOARD_PHASES.map((phase) => {
          const cards = columns[phase]
          const titleId = `ed-col-${phase}`
          return (
            <section
              key={phase}
              aria-labelledby={titleId}
              data-phase={phase}
              className="bg-muted/40 rounded-lg border p-2"
            >
              <h3
                id={titleId}
                className="mb-2 flex items-center justify-between px-1 text-sm font-semibold"
              >
                {copy.columns[phase]}
                <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">
                  {cards.length}
                </span>
              </h3>
              {cards.length === 0 ? (
                <p className="text-muted-foreground px-1 py-4 text-center text-xs">{copy.empty}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {cards.map((card) => (
                    <li key={card.visit.id}>
                      <EdCard card={card} phase={phase} now={now} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
