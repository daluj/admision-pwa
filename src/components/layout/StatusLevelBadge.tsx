import { CircleCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { es } from '@/i18n/es'

/** Hospital status level. Static "Normal" until alerts exist (Phase 7+). */
export function StatusLevelBadge() {
  return (
    <Badge
      className="bg-status-ok text-status-ok-foreground gap-1 border-transparent"
      title={es.topBar.statusLevel.label}
    >
      <CircleCheck aria-hidden="true" />
      <span className="sr-only">{es.topBar.statusLevel.label}: </span>
      {es.topBar.statusLevel.normal}
    </Badge>
  )
}
