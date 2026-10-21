import { balanceStatus, type BalanceForecast } from '@/domain/kpis'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SEVERITY_STYLES } from '@/components/dashboard/statusStyles'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'

const copy = es.pages.admissions.balance

/** Bed balance forecast for today with its breakdown and the deficit warning. Presentational. */
export function BalanceCard({ balance }: { balance: BalanceForecast }) {
  const status = balanceStatus(balance.value)
  const style = SEVERITY_STYLES[status]
  const Icon = style.icon
  const row = (label: string, value: number, sign: '+' | '−') => (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-muted-foreground text-sm">
        <span aria-hidden="true" className="mr-1">
          {sign}
        </span>
        {label}
      </dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  )
  return (
    <Card className="mb-6" data-status={status}>
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{copy.title}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <dl className="divide-y">
          {row(copy.available, balance.availableBeds, '+')}
          {row(copy.expectedRemaining, balance.expectedRemaining, '+')}
          {row(copy.boarding, balance.boarding, '−')}
          {row(copy.scheduledPending, balance.scheduledPending, '−')}
        </dl>
        <div
          className={cn(
            'flex flex-col justify-center rounded-lg border border-l-4 p-4',
            style.border,
          )}
        >
          <p className="text-muted-foreground text-sm">{copy.result}</p>
          <p className="flex items-center gap-2 text-4xl font-semibold tabular-nums">
            {balance.value}
            {Icon && <Icon className="size-6" aria-hidden="true" />}
          </p>
          <p
            className={cn('mt-1 text-sm', status !== 'ok' && 'font-medium')}
            role={status === 'ok' ? undefined : 'alert'}
          >
            {status === 'ok' ? copy.ok : copy.deficit(balance.value)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
