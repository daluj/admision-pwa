import { useState } from 'react'
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
import type { QueueRow } from '@/domain/kpis'
import { es } from '@/i18n/es'
import type { TransferActionResult } from '../useTransferActions'

const copy = es.pages.transfers.cancelSheet

type CancelSheetProps = {
  row: QueueRow | null
  unavailable?: boolean
  onConfirm: (reason: string) => Promise<TransferActionResult>
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
  busy?: boolean
}

/** Confirmation (with an optional reason) for cancelling a transfer before pickup. */
export function CancelSheet({ row, onClose, onCloseAutoFocus, ...rest }: CancelSheetProps) {
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
  unavailable = false,
  onConfirm,
  onClose,
  busy = false,
}: Omit<CancelSheetProps, 'row' | 'onCloseAutoFocus'> & { row: QueueRow }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const confirm = async () => {
    setError(null)
    const result = await onConfirm(reason.trim())
    if (result.ok) onClose()
    else setError(result.message)
  }
  return (
    <>
      <SheetHeader>
        <SheetTitle>{copy.title}</SheetTitle>
        <SheetDescription>{copy.description(`${row.initials} → ${row.toLabel}`)}</SheetDescription>
      </SheetHeader>
      <div className="flex-1 space-y-3 px-4 text-sm">
        {unavailable ? (
          <p role="alert" className="text-status-critical font-medium">
            {copy.gone}
          </p>
        ) : (
          <>
            <p>{copy.body}</p>
            <div className="space-y-1">
              <Label htmlFor="cancel-reason">{copy.reasonLabel}</Label>
              <Input
                id="cancel-reason"
                value={reason}
                maxLength={120}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </>
        )}
        {error && (
          <p role="alert" className="text-status-critical font-medium">
            {error}
          </p>
        )}
      </div>
      <SheetFooter>
        {unavailable ? (
          <Button variant="outline" onClick={onClose}>
            {copy.close}
          </Button>
        ) : (
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            {busy ? copy.working : copy.confirm}
          </Button>
        )}
      </SheetFooter>
    </>
  )
}
