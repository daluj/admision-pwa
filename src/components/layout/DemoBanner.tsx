import { FlaskConical } from 'lucide-react'
import { es } from '@/i18n/es'

export function DemoBanner() {
  return (
    <div
      role="note"
      className="bg-status-info text-status-info-foreground flex shrink-0 items-center justify-center gap-2 px-4 py-1 text-xs font-medium"
    >
      <FlaskConical className="size-3.5" aria-hidden="true" />
      <span>{es.banner.demo}</span>
    </div>
  )
}
