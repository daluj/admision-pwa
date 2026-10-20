import { Siren } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { es } from '@/i18n/es'

const copy = es.pages.emergency

export default function EmergencyPage() {
  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      <EmptyState icon={Siren} title={copy.emptyTitle} description={copy.emptyDescription} />
    </>
  )
}
