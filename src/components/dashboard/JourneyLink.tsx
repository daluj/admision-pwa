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
  inOwnUnit = false,
}: {
  patientId: string
  initials: string
  className?: string
  /**
   * The row is already limited to the user's own unit (a bed of the unit map). Nurse supervisors
   * only reach patients of their unit, so elsewhere the link is hidden for them.
   */
  inOwnUnit?: boolean
}) {
  // Boards are also rendered on their own (tests, previews): without a session or a router there is no link.
  const session = useContext(SessionContext)
  const inRouter = useInRouterContext()
  if (!inRouter || session?.status !== 'authenticated' || !session.can('tracking')) return null
  if (session.user.role === 'NURSE_SUPERVISOR' && !inOwnUnit) return null
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
