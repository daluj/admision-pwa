import { PageHeader } from '@/components/common/PageHeader'
import { es } from '@/i18n/es'
import { DatabaseStatusSection } from './components/DatabaseStatusSection'
import { StatusTokenSwatches } from './components/StatusTokenSwatches'

const copy = es.pages.settings

export default function SettingsPage() {
  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      <div className="flex flex-col gap-6">
        <DatabaseStatusSection />
        <StatusTokenSwatches />
      </div>
    </>
  )
}
