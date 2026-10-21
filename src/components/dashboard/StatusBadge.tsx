import { Ban, BedDouble, Bookmark, Brush, CircleCheck, Loader, type LucideIcon } from 'lucide-react'
import type { BedStatus } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'

/** Bed status colours (specs/ux-guidelines.md): always with an icon and the Spanish label. */
export const BED_STATUS_STYLES: Record<BedStatus, { classes: string; icon: LucideIcon }> = {
  AVAILABLE: { classes: 'bg-status-ok text-status-ok-foreground', icon: CircleCheck },
  RESERVED: { classes: 'bg-status-info text-status-info-foreground', icon: Bookmark },
  OCCUPIED: { classes: 'bg-foreground text-background', icon: BedDouble },
  PENDING_CLEANING: { classes: 'bg-status-warn text-status-warn-foreground', icon: Brush },
  CLEANING: { classes: 'bg-status-info text-status-info-foreground', icon: Loader },
  BLOCKED: { classes: 'bg-status-neutral text-status-neutral-foreground', icon: Ban },
}

type StatusBadgeProps = { kind: 'bed'; status: BedStatus; className?: string }

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { classes, icon: Icon } = BED_STATUS_STYLES[status]
  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        classes,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {es.pages.beds.status[status]}
    </span>
  )
}
