import { ArrowLeftRight } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { es } from '@/i18n/es'

const copy = es.pages.transfers

export default function TransfersPage() {
  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      <EmptyState
        icon={ArrowLeftRight}
        title={copy.emptyTitle}
        description={copy.emptyDescription}
      />
    </>
  )
}
