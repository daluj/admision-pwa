import { Route } from 'lucide-react'
import { useContext } from 'react'
import { Link, useInRouterContext } from 'react-router'
import { SessionContext } from '@/features/auth/sessionContext'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'

/**
 * Deep link from a dashboard row to the patient's journey (Seguimiento). Rendered only for roles
 * that can open that area; the URL carries the patient id, never a name or NHC.
 */
export function JourneyLink({
  patientId,
  initials,
  className,
}: {
  patientId: string
  initials: string
  className?: string
}) {
  // Boards are also rendered on their own (tests, previews): without a session or a router there is no link.
  const session = useContext(SessionContext)
  const inRouter = useInRouterContext()
  if (!inRouter || session?.status !== 'authenticated' || !session.can('tracking')) return null
  return (
    <Link
      to={`/seguimiento/${patientId}`}
      aria-label={es.pages.tracking.link(initials)}
      className={cn(
        'text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-6 items-center justify-center rounded focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
    >
      <Route className="size-4" aria-hidden="true" />
    </Link>
  )
}
