import { ExceptionList } from '@/components/dashboard'
import type { TransferException } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration } from '@/lib/format'

const copy = es.pages.transfers.exceptions

export function TransferExceptions({ exceptions }: { exceptions: readonly TransferException[] }) {
  return (
    <ExceptionList
      items={exceptions.map((e) => ({
        id: e.id,
        severity: e.severity,
        title: copy.late(e.initials, e.toLabel, formatDuration(e.overdueMs)),
        ageMs: e.ageMs,
      }))}
    />
  )
}
