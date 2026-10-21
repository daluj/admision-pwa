import { FastForward } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { es } from '@/i18n/es'
import { formatDateTime } from '@/lib/time'
import { useTimeLapse } from '../useTimeLapse'

const copy = es.timelapse
const PRESETS = ['10:00', '14:00', '20:00', '08:00'] as const
const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/

/** Fast-forward to a time of day; the run is left paused there. */
export function TimeLapseCard() {
  const lapse = useTimeLapse()
  const id = useId()
  const [time, setTime] = useState('14:00')
  const [invalid, setInvalid] = useState(false)

  const go = (value: string) => {
    const match = TIME.exec(value.trim())
    if (!match) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    void lapse.start(Number(match[1]), Number(match[2]))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FastForward className="text-muted-foreground size-5" aria-hidden="true" />
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          className="flex flex-wrap items-end gap-2"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            go(time)
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={id}>{copy.timeLabel}</Label>
            <Input
              id={id}
              inputMode="numeric"
              placeholder="HH:MM"
              className="w-28 tabular-nums"
              value={time}
              disabled={lapse.running}
              aria-invalid={invalid || undefined}
              onChange={(event) => {
                setTime(event.target.value)
                setInvalid(false)
              }}
            />
          </div>
          <Button type="submit" disabled={lapse.running}>
            {copy.go}
          </Button>
          {lapse.running && (
            <Button type="button" variant="outline" onClick={lapse.cancel}>
              {copy.cancel}
            </Button>
          )}
        </form>
        <div role="group" aria-label={copy.presets} className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant="outline"
              disabled={lapse.running}
              onClick={() => {
                setTime(preset)
                go(preset)
              }}
            >
              {preset}
            </Button>
          ))}
        </div>
        {invalid && (
          <p role="alert" className="text-status-critical text-sm font-medium">
            {copy.invalid}
          </p>
        )}
        {lapse.error && (
          <p role="alert" className="text-status-critical text-sm font-medium">
            {lapse.error}
          </p>
        )}
        {lapse.running && (
          <div role="status" className="flex flex-col gap-1 text-sm">
            <progress
              aria-label={copy.progressLabel}
              value={Math.round(lapse.fraction * 100)}
              max={100}
              className="w-full max-w-md"
            />
            <span className="text-muted-foreground tabular-nums">
              {copy.progress(
                Math.round(lapse.fraction * 100),
                lapse.at ? formatDateTime(lapse.at) : '',
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
