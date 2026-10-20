import { PanelLeftClose, PanelLeftOpen, RadioTower } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'
import { NavList } from './NavList'
import { useMediaQuery } from './useMediaQuery'

const COLLAPSED_STORAGE_KEY = 'torre-control:sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed))
  } catch {
    // Storage unavailable: the preference only lasts for this session.
  }
}

/** Desktop/tablet sidebar. Icons only below 1280 px or when collapsed; hidden on phones (see MobileNav). */
export function Sidebar() {
  const isWide = useMediaQuery('(min-width: 1280px)', true)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const showLabels = isWide && !collapsed

  const toggle = () => {
    setCollapsed((current) => {
      writeCollapsed(!current)
      return !current
    })
  }

  return (
    <aside
      className={cn(
        'bg-sidebar text-sidebar-foreground border-sidebar-border hidden shrink-0 flex-col border-r md:flex',
        showLabels ? 'w-60' : 'w-16',
      )}
    >
      <div
        className={cn('flex h-14 items-center gap-2 px-4', !showLabels && 'justify-center px-0')}
      >
        <RadioTower className="text-primary size-6 shrink-0" aria-hidden="true" />
        {showLabels && <span className="truncate font-semibold">{es.app.name}</span>}
      </div>
      <nav aria-label={es.nav.label} className="flex-1 overflow-y-auto px-2 py-2">
        <NavList showLabels={showLabels} />
      </nav>
      {isWide && (
        <div className={cn('p-2', !showLabels && 'flex justify-center')}>
          <Button
            variant="ghost"
            size={showLabels ? 'sm' : 'icon'}
            onClick={toggle}
            aria-expanded={showLabels}
            aria-label={showLabels ? es.nav.collapse : es.nav.expand}
            className={cn(showLabels && 'w-full justify-start')}
          >
            {showLabels ? (
              <PanelLeftClose aria-hidden="true" />
            ) : (
              <PanelLeftOpen aria-hidden="true" />
            )}
            {showLabels && es.nav.collapse}
          </Button>
        </div>
      )}
    </aside>
  )
}
