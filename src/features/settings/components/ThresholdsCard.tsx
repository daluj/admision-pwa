import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ALERT_CONFIG_RANGES,
  DEFAULT_ALERT_CONFIG,
  validateAlertConfig,
  type AlertConfig,
  type AlertConfigKey,
} from '@/domain/alerts'
import { resetAlertConfig, writeAlertConfig } from '@/features/alerts/alertConfigStore'
import { useAlertConfig } from '@/features/alerts/useAlertConfig'
import { es } from '@/i18n/es'

const copy = es.pages.settings.thresholds

type FieldSpec = { key: AlertConfigKey; unit: keyof typeof copy.units; scale?: number }
const GROUPS: readonly { id: keyof typeof copy.groups; fields: readonly FieldSpec[] }[] = [
  {
    id: 'status',
    fields: [
      { key: 'occupancyAlert', unit: 'percent', scale: 100 },
      { key: 'occupancyCritical', unit: 'percent', scale: 100 },
      { key: 'boardingCountAlert', unit: 'patients' },
      { key: 'boardingCountCritical', unit: 'patients' },
      { key: 'boardingStatusAlertHours', unit: 'hours' },
      { key: 'boardingStatusCriticalHours', unit: 'hours' },
    ],
  },
  {
    id: 'rules',
    fields: [
      { key: 'boardingLongWarnHours', unit: 'hours' },
      { key: 'boardingLongCriticalHours', unit: 'hours' },
      { key: 'pendingCleaningWarnMin', unit: 'minutes' },
      { key: 'pendingCleaningCriticalMin', unit: 'minutes' },
      { key: 'balanceCritical', unit: 'beds' },
    ],
  },
  { id: 'wall', fields: [{ key: 'wallRotationSec', unit: 'seconds' }] },
]
type FieldErrors = Partial<Record<AlertConfigKey, 'range' | 'order' | 'number'>>
const ALL_FIELDS = GROUPS.flatMap((g) => g.fields)

const toDraft = (config: AlertConfig): Record<AlertConfigKey, string> =>
  Object.fromEntries(
    ALL_FIELDS.map(({ key, scale = 1 }) => [
      key,
      String(Math.round(config[key] * scale * 100) / 100),
    ]),
  ) as Record<AlertConfigKey, string>

/** Edit the thresholds the status level and the alert rules use; saved in the browser, shared across tabs. */
export function ThresholdsCard() {
  const stored = useAlertConfig()
  const [draft, setDraft] = useState<Record<AlertConfigKey, string>>(() => toDraft(stored))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState<string | null>(null)

  const save = () => {
    const next = { ...stored } as AlertConfig
    const found: typeof errors = {}
    for (const { key, scale = 1 } of ALL_FIELDS) {
      const text = draft[key].trim().replace(',', '.')
      const value = text === '' ? Number.NaN : Number(text)
      if (!Number.isFinite(value)) found[key] = 'number'
      else next[key] = value / scale
    }
    if (Object.keys(found).length === 0) Object.assign(found, validateAlertConfig(next))
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setMessage(copy.invalid)
      return
    }
    setMessage(null)
    if (writeAlertConfig(next)) toast.success(copy.saved)
  }

  const restore = () => {
    resetAlertConfig()
    setDraft(toDraft(DEFAULT_ALERT_CONFIG))
    setErrors({})
    setMessage(null)
    toast.success(copy.restored)
  }

  const errorText = (key: AlertConfigKey, scale = 1): string | null => {
    const error = errors[key]
    if (!error) return null
    if (error === 'number') return copy.errors.number
    if (error === 'order') return copy.errors.order
    const { min, max } = ALERT_CONFIG_RANGES[key]
    return copy.errors.range(
      Math.round(min * scale * 100) / 100,
      Math.round(max * scale * 100) / 100,
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="text-muted-foreground size-5" aria-hidden="true" />
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
          noValidate
        >
          {GROUPS.map((group) => (
            <fieldset key={group.id} className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-semibold">{copy.groups[group.id]}</legend>
              {group.fields.map(({ key, unit, scale }) => {
                const error = errorText(key, scale)
                const id = `threshold-${key}`
                return (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={id}>{copy.fields[key]}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={id}
                        inputMode="decimal"
                        className="max-w-28"
                        value={draft[key]}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${id}-error` : undefined}
                        onChange={(event) => setDraft((d) => ({ ...d, [key]: event.target.value }))}
                      />
                      <span className="text-muted-foreground text-sm">{copy.units[unit]}</span>
                    </div>
                    {error && (
                      <p id={`${id}-error`} className="text-status-critical text-xs font-medium">
                        {error}
                      </p>
                    )}
                  </div>
                )
              })}
            </fieldset>
          ))}
          {message && (
            <p role="alert" className="text-status-critical text-sm font-medium">
              {message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit">{copy.save}</Button>
            <Button type="button" variant="outline" onClick={restore}>
              {copy.reset}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
