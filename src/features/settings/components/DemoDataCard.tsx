import { RotateCcw } from 'lucide-react'
import { useId, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { es } from '@/i18n/es'
import { formatDateTime } from '@/lib/time'

const copy = es.pages.settings.demo

export const SEED_PATTERN = /^\d{1,6}$/

type DemoDataCardProps = {
  /** Seed of the loaded demo; `null` when not seeded, `undefined` while loading. */
  currentSeed: number | null | undefined
  startedAt: string | null | undefined
  fallbackSeed: number
  busy: boolean
  onReset: (seed: number) => void
}

/** Presentational: current demo seed/start, seed field and the confirmed "Restablecer demo" action. */
export function DemoDataCard({
  currentSeed,
  startedAt,
  fallbackSeed,
  busy,
  onReset,
}: DemoDataCardProps) {
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const [showError, setShowError] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const value = draft ?? String(currentSeed ?? fallbackSeed)
  const valid = SEED_PATTERN.test(value)
  const seed = Number(value)

  const requestReset = () => {
    if (!valid) {
      setShowError(true)
      return
    }
    setConfirming(true)
  }

  const confirm = () => {
    setDraft(null)
    onReset(seed)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="text-muted-foreground size-5" aria-hidden="true" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <dl className="divide-y">
          <div className="flex items-baseline justify-between gap-4 py-1.5">
            <dt className="text-muted-foreground text-sm">{copy.currentSeed}</dt>
            <dd className="text-sm font-medium tabular-nums">
              {currentSeed === undefined ? '…' : (currentSeed ?? copy.notSeeded)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-1.5">
            <dt className="text-muted-foreground text-sm">{copy.startedAt}</dt>
            <dd className="text-sm font-medium tabular-nums">
              {startedAt ? formatDateTime(startedAt) : '—'}
            </dd>
          </div>
        </dl>
        <form
          className="flex flex-col gap-2"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            requestReset()
          }}
        >
          <Label htmlFor={inputId}>{copy.seedLabel}</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id={inputId}
              inputMode="numeric"
              autoComplete="off"
              className="w-36 tabular-nums"
              value={value}
              aria-invalid={showError && !valid}
              aria-describedby={showError && !valid ? errorId : hintId}
              onChange={(event) => {
                setDraft(event.target.value.trim())
                setShowError(false)
              }}
            />
            <Button type="submit" disabled={busy}>
              <RotateCcw aria-hidden="true" className={busy ? 'animate-spin' : undefined} />
              {busy ? copy.resetting : copy.reset}
            </Button>
          </div>
          {showError && !valid ? (
            <p id={errorId} role="alert" className="text-destructive text-sm">
              {copy.seedInvalid}
            </p>
          ) : (
            <p id={hintId} className="text-muted-foreground text-sm">
              {copy.seedHint}
            </p>
          )}
        </form>
      </CardContent>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.confirmDescription(seed)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>{copy.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
