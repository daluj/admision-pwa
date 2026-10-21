import { CircleUser, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUnits } from '@/data/hooks'
import { useSession } from '@/features/auth/useSession'
import { es } from '@/i18n/es'

/** Current simulated user: name, role, unit (supervisors) and logout. */
export function UserMenu() {
  const session = useSession()
  const units = useUnits()
  if (session.status !== 'authenticated') return null

  const { user, logout } = session
  const roleLabel = es.roles[user.role]
  const unitName = user.unitId ? units?.find((unit) => unit.id === user.unitId)?.name : undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-1.5 px-2"
          aria-label={`${es.topBar.user.menu}: ${user.displayName}`}
        >
          <CircleUser className="size-4" aria-hidden="true" />
          <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">
            {user.displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="font-medium">{user.displayName}</span>
          <span className="text-muted-foreground text-xs">{roleLabel}</span>
          {unitName && (
            <span className="text-muted-foreground text-xs">
              {es.topBar.user.unit}: {unitName}
            </span>
          )}
          <span className="text-muted-foreground text-xs">{es.topBar.user.role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOut aria-hidden="true" />
          {es.topBar.user.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
