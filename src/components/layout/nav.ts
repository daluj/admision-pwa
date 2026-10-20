import {
  ArrowLeftRight,
  BedDouble,
  LayoutDashboard,
  LogIn,
  type LucideIcon,
  Route,
  Settings,
  Siren,
} from 'lucide-react'
import type { Messages } from '@/i18n/es'

export type AreaId = keyof Messages['nav']['items']

export type NavItem = {
  id: AreaId
  path: string
  labelKey: AreaId
  icon: LucideIcon
  /** Reserved for Phase 4 (role-based navigation). */
  roles?: readonly string[]
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'overview', path: '/', labelKey: 'overview', icon: LayoutDashboard },
  { id: 'beds', path: '/camas', labelKey: 'beds', icon: BedDouble },
  { id: 'emergency', path: '/urgencias', labelKey: 'emergency', icon: Siren },
  { id: 'admissions', path: '/ingresos-altas', labelKey: 'admissions', icon: LogIn },
  { id: 'transfers', path: '/traslados', labelKey: 'transfers', icon: ArrowLeftRight },
  { id: 'tracking', path: '/seguimiento', labelKey: 'tracking', icon: Route },
  { id: 'settings', path: '/ajustes', labelKey: 'settings', icon: Settings },
]
