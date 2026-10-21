import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { WorklistRow } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { dayOffsetOf, DAY_OFFSETS, localTimeOf, nextFullHour, toInstant } from '../expectedTime'
import type { DischargeResult } from '../useDischargeActions'

const copy = es.pages.admissions.expectedSheet

type ExpectedSheetProps = {
  /** The patient being edited; `null` closes the sheet. */
  row: WorklistRow | null
  now: string
  /** The patient changed state while the sheet was open (e.g. the discharge was ordered). */
  unavailable?: boolean
  onSave: (expectedDischargeAt: string) => Promise<DischargeResult>
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
  busy?: boolean
}

/** Side sheet to set or edit the expected discharge: a day (today…+2) and a 24 h time. */
export function ExpectedSheet({
  row,
  now,
  unavailable = false,
  onSave,
  onClose,
  onCloseAutoFocus,
  busy = false,
}: ExpectedSheetProps) {
  return (
    <Sheet open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {row && (
          <Body
            key={row.admission.id}
            row={row}
            now={now}
            unavailable={unavailable}
            onSave={onSave}
            onClose={onClose}
            busy={busy}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function Body({
  row,
  now,
  unavailable,
  onSave,
  onClose,
  busy,
}: Omit<ExpectedSheetProps, 'row'> & { row: WorklistRow; busy: boolean; unavailable: boolean }) {
  const ids = { day: useId(), time: useId() }
  const suggestion = nextFullHour(now)
  const existing = row.expectedDischargeAt
  const [offset, setOffset] = useState<number>(
    (existing ? dayOffsetOf(existing, now) : null) ?? suggestion.offset,
  )
  const [time, setTime] = useState(existing ? localTimeOf(existing) : suggestion.time)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setError(null)
    const instant = toInstant(now, offset, time)
    if (!instant) return setError(copy.invalid.required)
    if (Date.parse(instant) <= Date.parse(now)) return setError(copy.invalid.past)
    const result = await onSave(instant)
    if (result.ok) onClose()
    else setError(result.message)
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{copy.title}</SheetTitle>
        <SheetDescription>
          {copy.description(`${row.bed.label} · ${row.initials}`)}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
        {unavailable ? (
          <p role="alert" className="text-status-critical text-sm font-medium">
            {copy.gone}
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.day}>{copy.day}</Label>
              <select
                id={ids.day}
                className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
              >
                {DAY_OFFSETS.map((d) => (
                  <option key={d} value={d}>
                    {copy.days[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.time}>{copy.time}</Label>
              <Input
                id={ids.time}
                type="time"
                value={time}
                aria-invalid={error !== null}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-status-critical text-sm font-medium">
                {error}
              </p>
            )}
          </>
        )}
      </div>
      <SheetFooter>
        {unavailable ? (
          <Button variant="outline" onClick={onClose}>
            {copy.close}
          </Button>
        ) : (
          <Button onClick={save} disabled={busy}>
            {busy ? copy.saving : copy.save}
          </Button>
        )}
      </SheetFooter>
    </>
  )
}
