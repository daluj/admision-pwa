import { LogIn } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { es } from '@/i18n/es'

const copy = es.pages.admissions

export default function AdmissionsPage() {
  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      <EmptyState icon={LogIn} title={copy.emptyTitle} description={copy.emptyDescription} />
    </>
  )
}
