import { ExceptionList, type ExceptionItem } from '@/components/dashboard'
import type { CensusException } from '@/domain/kpis'
import { es } from '@/i18n/es'
import { formatDuration } from '@/lib/format'

const copy = es.pages.beds.exceptions

function toItem(
  exception: CensusException,
  specialtyNames: ReadonlyMap<string, string>,
): ExceptionItem {
  const href = `/camas/${exception.unitCode}`
  switch (exception.kind) {
    case 'blockedLong':
      return {
        id: exception.id,
        severity: exception.severity,
        title: copy.blockedLong(exception.bedLabel, formatDuration(exception.ageMs)),
        ...(exception.reason ? { detail: copy.reason(exception.reason) } : {}),
        ageMs: exception.ageMs,
        href,
      }
    case 'cleaningLong':
      return {
        id: exception.id,
        severity: exception.severity,
        title: copy.cleaningLong(exception.bedLabel, formatDuration(exception.ageMs)),
        ageMs: exception.ageMs,
        href,
      }
    case 'unitFull':
      return {
        id: exception.id,
        severity: exception.severity,
        title: copy.unitFull(exception.unitName, Math.round(exception.occupancy * 100)),
        ageMs: exception.ageMs,
        href,
      }
    case 'outlier':
      return {
        id: exception.id,
        severity: exception.severity,
        title: copy.outlier(exception.initials, exception.unitName),
        detail: copy.outlierDetail(
          exception.bedLabel,
          specialtyNames.get(exception.specialtyCode) ?? exception.specialtyCode,
        ),
        ageMs: exception.ageMs,
        href,
      }
  }
}

export function CensusExceptions({
  exceptions,
  specialtyNames,
}: {
  exceptions: readonly CensusException[]
  specialtyNames: ReadonlyMap<string, string>
}) {
  return <ExceptionList items={exceptions.map((e) => toItem(e, specialtyNames))} />
}
