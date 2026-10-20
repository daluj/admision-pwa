import { BedDouble } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { es } from '@/i18n/es'

const copy = es.pages.beds

export default function BedsPage() {
  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      <EmptyState icon={BedDouble} title={copy.emptyTitle} description={copy.emptyDescription} />
    </>
  )
}
