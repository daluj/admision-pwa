import { BedDouble } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { useUnits } from '@/data/hooks'
import { useUnitScope } from '@/features/auth/useUnitScope'
import { es } from '@/i18n/es'

const copy = es.pages.beds

export default function BedsPage() {
  const unitId = useUnitScope()
  const units = useUnits()
  const unitName = unitId ? units?.find((unit) => unit.id === unitId)?.name : undefined

  return (
    <>
      <PageHeader title={copy.title} description={copy.description} />
      {unitName && (
        <p role="note" className="bg-status-info/15 mb-4 rounded-md px-3 py-2 text-sm font-medium">
          {es.scope.unitOnly(unitName)}
        </p>
      )}
      <EmptyState icon={BedDouble} title={copy.emptyTitle} description={copy.emptyDescription} />
    </>
  )
}
