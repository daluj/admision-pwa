import { LayoutDashboard } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { es } from '@/i18n/es'

const copy = es.pages.overview

export default function OverviewPage() {
  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      <EmptyState
        icon={LayoutDashboard}
        title={copy.emptyTitle}
        description={copy.emptyDescription}
      />
    </>
  )
}
