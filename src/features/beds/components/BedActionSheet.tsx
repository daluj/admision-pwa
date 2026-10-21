import { useState } from 'react'
import { StatusBadge } from '@/components/dashboard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { BedAction } from '@/domain/access'
import type { BedView } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration, formatRelativeDay } from '@/lib/format'
import type { BedActionResult } from '../useBedActions'

const copy = es.pages.beds.bedSheet
const unitCopy = es.pages.beds.unit

/** What the sheet asks the container to do; the container adds the ids. */
export type BedSheetCommand =
  | { action: 'block'; reason: string }
  | { action: 'release'; reason?: string }
  | { action: 'unblock' | 'startCleaning' | 'finishCleaning' }

type BedActionSheetProps = {
  /** The selected bed (live); `null` closes the sheet. */
  view: BedView | null
  now: string
  /** Actions this user may take on this bed right now (status and role already applied). */
  allowed: readonly BedAction[]
  onPerform: (command: BedSheetCommand) => Promise<BedActionResult>
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
  busy?: boolean
}

/** Side sheet for one bed: its state and the actions allowed for its status and the user's role. */
export function BedActionSheet({
  view,
  now,
  allowed,
  onPerform,
  onClose,
  onCloseAutoFocus,
  busy = false,
}: BedActionSheetProps) {
  return (
    <Sheet open={view !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {view && (
          <Body
            key={view.bed.id}
            view={view}
            now={now}
            allowed={allowed}
            onPerform={onPerform}
            onClose={onClose}
            busy={busy}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function Body({
  view,
  now,
  allowed,
  onPerform,
  onClose,
  busy,
}: Pick<BedActionSheetProps, 'now' | 'allowed' | 'onPerform' | 'onClose'> & {
  view: BedView
  busy: boolean
}) {
  const { bed, unit } = view
  const [error, setError] = useState<string | null>(null)

  const run = async (command: BedSheetCommand) => {
    setError(null)
    const result = await onPerform(command)
    if (result.ok) onClose()
    else setError(result.message)
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{copy.title(bed.label)}</SheetTitle>
        <SheetDescription>{unit.name}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
        <div className="flex flex-col gap-1 text-sm">
          <StatusBadge kind="bed" status={bed.status} className="self-start" />
          {view.patient && <p className="font-medium">{copy.patient(view.patient.initials)}</p>}
          {view.losMs !== undefined && (
            <p className="text-muted-foreground">{unitCopy.stay(formatDuration(view.losMs))}</p>
          )}
          {bed.status === 'OCCUPIED' && (
            <p className="text-muted-foreground">
              {view.dischargeOrdered
                ? unitCopy.discharge.ordered
                : view.expectedDischargeAt
                  ? unitCopy.discharge.expected(formatRelativeDay(view.expectedDischargeAt, now))
                  : unitCopy.discharge.none}
            </p>
          )}
          {bed.status === 'BLOCKED' && bed.blockedReason && (
            <p className="text-muted-foreground">{bed.blockedReason}</p>
          )}
          {(bed.status === 'BLOCKED' ||
            bed.status === 'PENDING_CLEANING' ||
            bed.status === 'CLEANING') && (
            <p className="text-muted-foreground">
              {unitCopy.since} {formatDuration(Date.parse(now) - Date.parse(bed.statusChangedAt))}
            </p>
          )}
        </div>

        {allowed.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {bed.status === 'OCCUPIED' ? copy.occupied : copy.readOnly}
          </p>
        ) : (
          <section aria-label={copy.actions} className="flex flex-col gap-4">
            {allowed.includes('startCleaning') && (
              <Button disabled={busy} onClick={() => run({ action: 'startCleaning' })}>
                {copy.startCleaning}
              </Button>
            )}
            {allowed.includes('finishCleaning') && (
              <Button disabled={busy} onClick={() => run({ action: 'finishCleaning' })}>
                {copy.finishCleaning}
              </Button>
            )}
            {allowed.includes('unblock') && (
              <Button disabled={busy} onClick={() => run({ action: 'unblock' })}>
                {copy.unblock}
              </Button>
            )}
            {allowed.includes('release') && (
              <ReleaseForm
                busy={busy}
                onSubmit={(reason) => run({ action: 'release', ...(reason ? { reason } : {}) })}
              />
            )}
            {allowed.includes('block') && (
              <BlockForm busy={busy} onSubmit={(reason) => run({ action: 'block', reason })} />
            )}
          </section>
        )}

        {error && (
          <p role="alert" className="text-status-critical text-sm font-medium">
            {error}
          </p>
        )}
      </div>
    </>
  )
}

function ReleaseForm({ busy, onSubmit }: { busy: boolean; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(reason.trim())
      }}
    >
      <Label htmlFor="release-reason">{copy.release.reason}</Label>
      <Input id="release-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button type="submit" variant="outline" disabled={busy}>
        {copy.release.submit}
      </Button>
    </form>
  )
}

function BlockForm({ busy, onSubmit }: { busy: boolean; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const missing = reason.trim() === ''
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if (!missing) onSubmit(reason.trim())
      }}
    >
      <p className="text-sm font-medium">{copy.block.title}</p>
      <Label htmlFor="block-preset" className="sr-only">
        {copy.block.presets}
      </Label>
      <select
        id="block-preset"
        className="border-input bg-background h-9 rounded-md border px-2 text-sm"
        value=""
        onChange={(e) => e.target.value && setReason(e.target.value)}
      >
        <option value="">{copy.block.preset}</option>
        {copy.blockReasons.map((preset) => (
          <option key={preset} value={preset}>
            {preset}
          </option>
        ))}
      </select>
      <Label htmlFor="block-reason">{copy.block.reason}</Label>
      <Input
        id="block-reason"
        value={reason}
        aria-invalid={touched && missing}
        aria-describedby={touched && missing ? 'block-reason-error' : undefined}
        onChange={(e) => setReason(e.target.value)}
      />
      {touched && missing && (
        <p id="block-reason-error" className="text-status-critical text-xs">
          {copy.block.required}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={busy}>
        {copy.block.submit}
      </Button>
    </form>
  )
}
