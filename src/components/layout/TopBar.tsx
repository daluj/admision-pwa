import { Separator } from '@/components/ui/separator'
import { SimulationControls } from '@/features/simulation/SimulationControls'
import { AlertBell } from '@/features/alerts/AlertBell'
import { StatusLevelBadge } from '@/features/alerts/StatusLevelBadge'
import { WallLink } from '@/features/wall/WallLink'
import { MobileNav } from './MobileNav'
import { SimClock } from './SimClock'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

export function TopBar() {
  return (
    <header className="bg-background/95 flex h-14 shrink-0 items-center gap-2 border-b px-2 sm:gap-3 sm:px-4">
      <MobileNav />
      <StatusLevelBadge />
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <SimClock />
        <SimulationControls />
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <WallLink />
        <AlertBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
