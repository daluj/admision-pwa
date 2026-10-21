import { LogIn } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { es } from '@/i18n/es'
import { AdmissionExceptions } from './components/AdmissionExceptions'
import { AdmissionKpis } from './components/AdmissionKpis'
import { BalanceCard } from './components/BalanceCard'
import { DischargeSection } from './components/DischargeSection'
import { ScheduledTable } from './components/ScheduledTable'
import { UnitDischargeTable } from './components/UnitDischargeTable'
import { useAdmissionsData } from './useAdmissionsData'

const copy = es.pages.admissions

/** `/ingresos-altas`: KPIs → exceptions → scheduled admissions, discharges, worklist → balance forecast. */
export default function AdmissionsPage() {
  const result = useAdmissionsData()

  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      {!result ? (
        <p role="status" aria-busy="true" className="text-muted-foreground text-sm">
          {copy.loading}
        </p>
      ) : result.restricted && !result.unitName ? (
        <EmptyState icon={LogIn} title={copy.noUnit.title} description={copy.noUnit.description} />
      ) : (
        <>
          {result.restricted && result.unitName && (
            <p
              role="note"
              className="bg-status-info/15 mb-4 rounded-md px-3 py-2 text-sm font-medium"
            >
              {copy.scopeNotice(result.unitName)}
            </p>
          )}
          <AdmissionKpis kpis={result.data.kpis} balance={result.data.balance} />
          <AdmissionExceptions exceptions={result.data.exceptions} />
          <ScheduledTable rows={result.data.scheduled} />
          <UnitDischargeTable rows={result.data.byUnit} totals={result.data.totals} />
          <DischargeSection data={result.data} now={result.now} />
          <BalanceCard balance={result.data.balance} />
        </>
      )}
    </>
  )
}
