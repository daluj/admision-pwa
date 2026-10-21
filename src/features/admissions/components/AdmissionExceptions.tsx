import { ExceptionList, type ExceptionItem } from '@/components/dashboard'
import type { AdmissionsException } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration } from '@/lib/format'

const copy = es.pages.admissions.exceptions

function toItem(e: AdmissionsException): ExceptionItem {
  switch (e.kind) {
    case 'balanceDeficit':
      return { id: e.id, severity: e.severity, title: copy.balanceDeficit(e.value), ageMs: e.ageMs }
    case 'scheduledLate':
      return {
        id: e.id,
        severity: e.severity,
        title: copy.scheduledLate(e.initials, formatDuration(e.sinceMs)),
        ageMs: e.ageMs,
      }
    case 'dischargeStuck':
      return {
        id: e.id,
        severity: e.severity,
        title: copy.dischargeStuck(e.initials, e.bedLabel, formatDuration(e.sinceMs)),
        ageMs: e.ageMs,
      }
  }
}

export function AdmissionExceptions({
  exceptions,
}: {
  exceptions: readonly AdmissionsException[]
}) {
  return <ExceptionList items={exceptions.map(toItem)} />
}
