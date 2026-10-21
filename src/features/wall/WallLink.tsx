import { Monitor } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSession } from '@/features/auth/useSession'
import { es } from '@/i18n/es'
import { WALL_AREA } from './slides'

/** Top-bar entry to the wall display, for roles that can open the overview. */
export function WallLink() {
  const session = useSession()
  if (session.status !== 'authenticated' || !session.can(WALL_AREA)) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
          <Link to="/pantalla" aria-label={es.wall.link}>
            <Monitor aria-hidden="true" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{es.wall.link}</TooltipContent>
    </Tooltip>
  )
}
