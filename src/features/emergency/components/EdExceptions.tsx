import { ExceptionList, type ExceptionItem } from '@/components/dashboard'
import type { EdException } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration } from '@/lib/format'

const copy = es.pages.emergency.exceptions

function toItem(exception: EdException): ExceptionItem {
  if (exception.kind === 'triageBreach') {
    return {
      id: exception.id,
      severity: exception.severity,
      title: copy.triageBreach(
        exception.initials,
        exception.level,
        formatDuration(exception.waitMs),
      ),
      detail: copy.triageDetail(exception.targetMin),
      ageMs: exception.ageMs,
    }
  }
  return {
    id: exception.id,
    severity: exception.severity,
    title: copy.boardingLong(exception.initials, formatDuration(exception.ageMs)),
    ageMs: exception.ageMs,
  }
}

/** "Necesita atención" for the ED: late triaged patients and long boarders. */
export function EdExceptions({ exceptions }: { exceptions: readonly EdException[] }) {
  return <ExceptionList items={exceptions.map(toItem)} />
}
