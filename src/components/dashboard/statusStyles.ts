import { CircleCheck, Info, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react'

export type Severity = 'ok' | 'warn' | 'critical' | 'info' | 'neutral'

/** Static class names (Tailwind needs them whole). Colour is always paired with an icon and/or text. */
export const SEVERITY_STYLES: Record<
  Severity,
  { border: string; badge: string; icon: LucideIcon | null }
> = {
  ok: {
    border: 'border-l-status-ok',
    badge: 'bg-status-ok text-status-ok-foreground',
    icon: CircleCheck,
  },
  warn: {
    border: 'border-l-status-warn',
    badge: 'bg-status-warn text-status-warn-foreground',
    icon: TriangleAlert,
  },
  critical: {
    border: 'border-l-status-critical',
    badge: 'bg-status-critical text-status-critical-foreground',
    icon: OctagonAlert,
  },
  info: {
    border: 'border-l-status-info',
    badge: 'bg-status-info text-status-info-foreground',
    icon: Info,
  },
  neutral: {
    border: 'border-l-border',
    badge: 'bg-status-neutral text-status-neutral-foreground',
    icon: null,
  },
}
