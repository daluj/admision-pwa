import { CircleUser } from 'lucide-react'
import { es } from '@/i18n/es'

/** Current user. Static "Invitado" until simulated login adds a real menu (Phase 4). */
export function UserMenu() {
  return (
    <div className="flex items-center gap-1.5 px-2 text-sm font-medium" title={es.topBar.user.role}>
      <CircleUser className="size-4" aria-hidden="true" />
      <span className="sr-only">{es.topBar.user.label}: </span>
      <span className="sr-only sm:not-sr-only">{es.topBar.user.guest}</span>
    </div>
  )
}
