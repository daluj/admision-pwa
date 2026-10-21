import { NavLink } from 'react-router'
import { useSession } from '@/features/auth/useSession'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from './nav'

type NavListProps = {
  showLabels: boolean
  onNavigate?: () => void
}

export function NavList({ showLabels, onNavigate }: NavListProps) {
  const session = useSession()
  if (session.status !== 'authenticated') return null
  const items = NAV_ITEMS.filter((item) => session.can(item.id))
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const label = es.nav.items[item.labelKey]
        const Icon = item.icon
        const link = (
          <NavLink
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            aria-label={showLabels ? undefined : label}
            className={({ isActive }) =>
              cn(
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                !showLabels && 'justify-center px-0',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80',
              )
            }
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {showLabels && <span className="truncate">{label}</span>}
          </NavLink>
        )
        return (
          <li key={item.id}>
            {showLabels ? (
              link
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            )}
          </li>
        )
      })}
    </ul>
  )
}
