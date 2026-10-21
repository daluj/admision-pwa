import { CircleAlert, CircleCheck, OctagonAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { StatusLevel } from '@/domain/alerts'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'
import { useStatusLevel } from './useStatusLevel'

const copy = es.topBar.statusLevel
const LEVELS = {
  NORMAL: { text: copy.normal, icon: CircleCheck, style: 'bg-status-ok text-status-ok-foreground' },
  ALERT: {
    text: copy.alert,
    icon: CircleAlert,
    style: 'bg-status-warn text-status-warn-foreground',
  },
  CRITICAL: {
    text: copy.critical,
    icon: OctagonAlert,
    style: 'bg-status-critical text-status-critical-foreground',
  },
} as const

/** The hospital status level for display: icon + text + colour, never colour alone. */
export function StatusLevel({ level, className }: { level: StatusLevel; className?: string }) {
  const { text, icon: Icon, style } = LEVELS[level]
  return (
    <Badge
      data-level={level}
      className={cn('gap-1 border-transparent', style, className)}
      title={copy.label}
    >
      <Icon aria-hidden="true" />
      <span className="sr-only">{copy.label}: </span>
      {text}
    </Badge>
  )
}

/** Top-bar badge: live level (Normal until the data has loaded). */
export function StatusLevelBadge() {
  const status = useStatusLevel()
  return <StatusLevel level={status?.level ?? 'NORMAL'} />
}
