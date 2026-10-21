import { ArrowLeftRight } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { useSession } from '@/features/auth/useSession'
import { es } from '@/i18n/es'
import { DispatchBoard } from './components/DispatchBoard'
import { MyQueue } from './components/MyQueue'
import { useTransfersData } from './useTransfersData'

const copy = es.pages.transfers

/** `/traslados`: Mi cola for a porter, the dispatch board for everyone else. */
export default function TransfersPage() {
  const result = useTransfersData()
  const session = useSession()
  const isPorter = session.status === 'authenticated' && session.user.role === 'PORTER'

  return (
    <>
      <PageHeader
        title={isPorter ? copy.myQueue.title : copy.title}
        description={isPorter ? copy.myQueue.description : copy.description}
      />
      {!result ? (
        <p role="status" aria-busy="true" className="text-muted-foreground text-sm">
          {copy.loading}
        </p>
      ) : isPorter ? (
        result.data.mine ? (
          <MyQueue view={result.data.mine} />
        ) : (
          <EmptyState
            icon={ArrowLeftRight}
            title={copy.myQueue.noPorter.title}
            description={copy.myQueue.noPorter.description}
          />
        )
      ) : (
        <DispatchBoard data={result.data} />
      )}
    </>
  )
}
