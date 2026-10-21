import { Siren } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { canActOnBed } from '@/domain/access'
import { useSession } from '@/features/auth/useSession'
import { es } from '@/i18n/es'
import { BoardingTable } from './components/BoardingTable'
import { EdBoard } from './components/EdBoard'
import { EdExceptions } from './components/EdExceptions'
import { EdKpis } from './components/EdKpis'
import { WaitChart } from './components/WaitChart'
import { useEd } from './useEd'

const copy = es.pages.emergency

/** `/urgencias`: KPIs → exceptions → ED board → boarding list → waiting-time chart. Read-only. */
export default function EmergencyPage() {
  const data = useEd()
  const session = useSession()
  // The link to Camas is only useful to people who can reserve beds there.
  const canManageBeds =
    session.status === 'authenticated' &&
    canActOnBed(session.user.role, 'reserve', { unitId: '', userUnitId: session.user.unitId })

  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      {!data ? (
        <p role="status" className="text-muted-foreground text-sm" aria-busy="true">
          {copy.loading}
        </p>
      ) : !data.hasVisits ? (
        <EmptyState icon={Siren} title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : (
        <>
          <EdKpis kpis={data.ed.kpis} />
          <EdExceptions exceptions={data.ed.exceptions} />
          <EdBoard columns={data.ed.columns} now={data.now} />
          <BoardingTable rows={data.ed.boarding} now={data.now} canManage={canManageBeds} />
          <WaitChart hourly={data.ed.hourly} />
        </>
      )}
    </>
  )
}
