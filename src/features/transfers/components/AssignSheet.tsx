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
import type { PorterRow, QueueRow } from '@/domain/kpis'
import { es } from '@/i18n/es'
import type { TransferActionResult } from '../useTransferActions'

const copy = es.pages.transfers.assignSheet

type AssignSheetProps = {
  row: QueueRow | null
  /** Available porters, the suggested one (free the longest) first. */
  porters: readonly PorterRow[]
  unavailable?: boolean
  onConfirm: (porterId: string) => Promise<TransferActionResult>
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
  busy?: boolean
}

/** Pick an available porter for a transfer. */
export function AssignSheet({ row, onClose, onCloseAutoFocus, ...rest }: AssignSheetProps) {
  return (
    <Sheet open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {row && <Body key={row.transfer.id} row={row} onClose={onClose} {...rest} />}
      </SheetContent>
    </Sheet>
  )
}

function Body({
  row,
  porters,
  unavailable = false,
  onConfirm,
  onClose,
  busy = false,
}: Omit<AssignSheetProps, 'row' | 'onCloseAutoFocus'> & { row: QueueRow }) {
  const [choice, setChoice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const selected =
    (choice && porters.some((p) => p.porter.id === choice) ? choice : null) ??
    porters[0]?.porter.id ??
    null
  const confirm = async () => {
    if (!selected) return
    setError(null)
    const result = await onConfirm(selected)
    if (result.ok) onClose()
    else setError(result.message)
  }
  return (
    <>
      <SheetHeader>
        <SheetTitle>{copy.title}</SheetTitle>
        <SheetDescription>{copy.description(`${row.initials} → ${row.toLabel}`)}</SheetDescription>
      </SheetHeader>
      <div className="flex-1 px-4 text-sm">
        {unavailable ? (
          <p role="alert" className="text-status-critical font-medium">
            {copy.gone}
          </p>
        ) : porters.length === 0 ? (
          <p role="status">{copy.none}</p>
        ) : (
          <fieldset>
            <legend className="mb-2 font-medium">{copy.pick}</legend>
            <ul className="space-y-2">
              {porters.map(({ porter }, index) => (
                <li key={porter.id}>
                  <label className="flex items-center gap-2" htmlFor={`assign-${porter.id}`}>
                    <input
                      id={`assign-${porter.id}`}
                      type="radio"
                      name="porter"
                      checked={selected === porter.id}
                      onChange={() => setChoice(porter.id)}
                    />
                    <span>{porter.name}</span>
                    {index === 0 && (
                      <span className="text-muted-foreground text-xs">{copy.suggested}</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        {error && (
          <p role="alert" className="text-status-critical mt-3 font-medium">
            {error}
          </p>
        )}
      </div>
      <SheetFooter>
        {unavailable || porters.length === 0 ? (
          <Button variant="outline" onClick={onClose}>
            {copy.close}
          </Button>
        ) : (
          <Button onClick={confirm} disabled={busy || !selected}>
            {busy ? copy.working : copy.confirm}
          </Button>
        )}
      </SheetFooter>
    </>
  )
}
