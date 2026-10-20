import { Settings } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusTokenSwatches } from './components/StatusTokenSwatches'
import { es } from '@/i18n/es'

const copy = es.pages.settings

export default function SettingsPage() {
  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      <div className="flex flex-col gap-6">
        <EmptyState icon={Settings} title={copy.emptyTitle} description={copy.emptyDescription} />
        <StatusTokenSwatches />
      </div>
    </>
  )
}
