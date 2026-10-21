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
import type { WorklistRow } from '@/domain/kpis'
import { es } from '@/i18n/es'
import type { DischargeResult } from '../useDischargeActions'

const copy = es.pages.admissions.orderSheet

type OrderSheetProps = {
  row: WorklistRow | null
  unavailable?: boolean
  onConfirm: () => Promise<DischargeResult>
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
  busy?: boolean
}

/** Confirmation sheet for ordering a discharge. */
export function OrderSheet({
  row,
  unavailable = false,
  onConfirm,
  onClose,
  onCloseAutoFocus,
  busy = false,
}: OrderSheetProps) {
  const [error, setError] = useState<string | null>(null)
  const confirm = async () => {
    setError(null)
    const result = await onConfirm()
    if (result.ok) onClose()
    else setError(result.message)
  }
  return (
    <Sheet open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {row && (
          <>
            <SheetHeader>
              <SheetTitle>{copy.title}</SheetTitle>
              <SheetDescription>
                {copy.description(`${row.bed.label} · ${row.initials}`)}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 px-4 text-sm">
              {unavailable ? (
                <p role="alert" className="text-status-critical font-medium">
                  {copy.gone}
                </p>
              ) : (
                <p>{copy.body}</p>
              )}
              {error && (
                <p role="alert" className="text-status-critical mt-3 font-medium">
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
                <Button onClick={confirm} disabled={busy}>
                  {busy ? copy.working : copy.confirm}
                </Button>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
