import { Route } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { es } from '@/i18n/es'

const copy = es.pages.tracking

export default function TrackingPage() {
  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      <EmptyState icon={Route} title={copy.emptyTitle} description={copy.emptyDescription} />
    </>
  )
}
