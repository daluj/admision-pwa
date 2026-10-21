import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { BedSuggestion, BedSuggestions, OpenRequestRow } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'
import type { BedActionResult } from '../useBedActions'

const copy = es.pages.beds.assignSheet

type AssignBedSheetProps = {
  /** The request being assigned; `null` closes the sheet. */
  row: OpenRequestRow | null
  suggestions: BedSuggestions
  onReserve: (candidate: BedSuggestion) => Promise<BedActionResult>
  onClose: () => void
  /** Where focus goes when the sheet closes (the button that opened it). */
  onCloseAutoFocus?: (event: Event) => void
  busy?: boolean
}

/** Side sheet: ranked bed suggestions for one request and a confirm button. */
export function AssignBedSheet({
  row,
  suggestions,
  onReserve,
  onClose,
  onCloseAutoFocus,
  busy = false,
}: AssignBedSheetProps) {
  return (
    <Sheet open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {row && (
          <SheetBody
            key={row.request.id}
            row={row}
            suggestions={suggestions}
            onReserve={onReserve}
            onClose={onClose}
            busy={busy}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function SheetBody({
  row,
  suggestions,
  onReserve,
  onClose,
  busy,
}: Omit<AssignBedSheetProps, 'row'> & { row: OpenRequestRow; busy: boolean }) {
  const [showAll, setShowAll] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const shown = showAll ? suggestions.candidates : suggestions.suggestions
  // A bed taken by someone else (the simulator) drops out of the live candidates: the choice goes with it.
  const selected = suggestions.candidates.find((c) => c.bed.id === selectedId) ?? null

  const reserve = async () => {
    if (!selected) return
    setError(null)
    const result = await onReserve(selected)
    if (result.ok) onClose()
    else setError(result.message)
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{copy.title}</SheetTitle>
        <SheetDescription>
          {copy.description(
            row.initials ?? '',
            row.specialtyName,
            es.pages.beds.unitTypes[row.request.requiredUnitType],
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4">
        {suggestions.candidates.length === 0 ? (
          <p className="text-muted-foreground text-sm">{copy.none}</p>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              {showAll ? copy.all : copy.suggested}
            </legend>
            {shown.map((candidate) => {
              const { bed, unit, tags } = candidate
              const checked = selected?.bed.id === bed.id
              const id = `assign-bed-${bed.id}`
              return (
                <div
                  key={bed.id}
                  className={cn(
                    'hover:bg-accent focus-within:ring-ring flex items-start gap-3 rounded-md border p-3 focus-within:ring-2',
                    checked && 'border-primary bg-accent',
                  )}
                >
                  <input
                    id={id}
                    type="radio"
                    name="bed"
                    className="mt-1"
                    checked={checked}
                    onChange={() => {
                      setSelectedId(bed.id)
                      setError(null)
                    }}
                  />
                  <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                    <span className="block text-sm font-semibold tabular-nums">{bed.label}</span>
                    <span className="text-muted-foreground block text-xs">
                      {unit.name} · {es.pages.beds.grid.floor(unit.building, unit.floor)}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          data-tag={tag}
                          className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs"
                        >
                          {copy.tags[tag]}
                        </span>
                      ))}
                    </span>
                  </label>
                </div>
              )
            })}
            {suggestions.candidates.length > suggestions.suggestions.length && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                aria-expanded={showAll}
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? copy.showLess : copy.showAll(suggestions.candidates.length)}
              </Button>
            )}
          </fieldset>
        )}
        {error && (
          <p role="alert" className="text-status-critical mt-3 text-sm font-medium">
            {error}
          </p>
        )}
      </div>

      <SheetFooter>
        <Button onClick={reserve} disabled={!selected || busy}>
          {busy ? copy.reserving : copy.reserve}
        </Button>
        {!selected && <p className="text-muted-foreground text-xs">{copy.selectHint}</p>}
      </SheetFooter>
    </>
  )
}
