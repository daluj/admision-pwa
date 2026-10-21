import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { RequestTransferInput } from '@/domain/commands'
import type { TransferPriority, TransferReason } from '@/domain/schemas'
import { es } from '@/i18n/es'
import type { TransferActionResult } from '../useTransferActions'

const copy = es.pages.transfers.newSheet
const details = es.pages.settings.eventLog.details

/** An inpatient a transfer can be requested for. */
export type InpatientOption = {
  patientId: string
  bedId: string
  /** "Planta 1 101 · M. G. R." */
  label: string
  /** Where the patient is now, for the transfer's origin. */
  fromLabel: string
}

type Destination = keyof typeof copy.destinations
const REASONS: readonly TransferReason[] = ['TEST', 'SURGERY', 'INTER_UNIT', 'RETURN']
const PRIORITIES: readonly TransferPriority[] = ['NORMAL', 'URGENT']
const DEFAULT_REASON: Record<Destination, TransferReason> = {
  RADIOLOGY: 'TEST',
  OR: 'SURGERY',
  OTHER: 'INTER_UNIT',
}

type NewTransferSheetProps = {
  open: boolean
  options: readonly InpatientOption[]
  onConfirm: (input: RequestTransferInput, label: string) => Promise<TransferActionResult>
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
  busy?: boolean
}

/** "Nuevo traslado": request a porter for an inpatient. */
export function NewTransferSheet({
  open,
  onClose,
  onCloseAutoFocus,
  ...rest
}: NewTransferSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {open && <Body onClose={onClose} {...rest} />}
      </SheetContent>
    </Sheet>
  )
}

function Body({
  options,
  onConfirm,
  onClose,
  busy = false,
}: Omit<NewTransferSheetProps, 'open' | 'onCloseAutoFocus'>) {
  const [bedId, setBedId] = useState('')
  const [destination, setDestination] = useState<Destination>('RADIOLOGY')
  const [reason, setReason] = useState<TransferReason>('TEST')
  const [priority, setPriority] = useState<TransferPriority>('NORMAL')
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    const chosen = options.find((o) => o.bedId === bedId)
    if (!chosen) {
      setError(copy.required)
      return
    }
    setError(null)
    const to = copy.destinations[destination]
    const result = await onConfirm(
      {
        patientId: chosen.patientId,
        fromLocation: { kind: 'BED', refId: chosen.bedId, label: chosen.fromLabel },
        toLocation: { kind: destination, label: to },
        reason,
        priority,
      },
      `${chosen.label.split(' · ').at(-1)} → ${to}`,
    )
    if (result.ok) onClose()
    else setError(result.message)
  }

  const field = 'border-input bg-background h-9 w-full rounded-md border px-2 text-sm'
  return (
    <>
      <SheetHeader>
        <SheetTitle>{copy.title}</SheetTitle>
        <SheetDescription>{copy.description}</SheetDescription>
      </SheetHeader>
      <div className="flex-1 space-y-3 px-4 text-sm">
        {options.length === 0 ? (
          <p role="status">{copy.noPatients}</p>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor="new-transfer-patient">{copy.patient}</Label>
              <select
                id="new-transfer-patient"
                className={field}
                value={bedId}
                onChange={(event) => setBedId(event.target.value)}
              >
                <option value="">{copy.patientPlaceholder}</option>
                {options.map((o) => (
                  <option key={o.bedId} value={o.bedId}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-transfer-destination">{copy.destination}</Label>
              <select
                id="new-transfer-destination"
                className={field}
                value={destination}
                onChange={(event) => {
                  const next = event.target.value as Destination
                  setDestination(next)
                  setReason(DEFAULT_REASON[next])
                }}
              >
                {(Object.keys(copy.destinations) as Destination[]).map((d) => (
                  <option key={d} value={d}>
                    {copy.destinations[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-transfer-reason">{copy.reason}</Label>
              <select
                id="new-transfer-reason"
                className={field}
                value={reason}
                onChange={(event) => setReason(event.target.value as TransferReason)}
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {details.transferReasons[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-transfer-priority">{copy.priority}</Label>
              <select
                id="new-transfer-priority"
                className={field}
                value={priority}
                onChange={(event) => setPriority(event.target.value as TransferPriority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {details.transferPriorities[p]}
                  </option>
                ))}
              </select>
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
        <Button onClick={confirm} disabled={busy || options.length === 0}>
          {busy ? copy.working : copy.confirm}
        </Button>
      </SheetFooter>
    </>
  )
}
