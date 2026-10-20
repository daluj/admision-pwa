import { CircleUser } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { es } from '@/i18n/es'

/** Current user. Always "Invitado" until simulated login (Phase 4). */
export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${es.topBar.user.label}: ${es.topBar.user.guest}`}
        >
          <CircleUser aria-hidden="true" />
          <span className="hidden sm:inline">{es.topBar.user.guest}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="flex flex-col">
          <span>{es.topBar.user.guest}</span>
          <span className="text-muted-foreground text-xs font-normal">{es.topBar.user.role}</span>
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
