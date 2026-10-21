import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router'
import { toast } from 'sonner'
import { homeFor, type AreaId } from '@/domain/access'
import type { Role } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { SessionProvider } from './SessionProvider'
import { useSession } from './useSession'

/** Root route element: provides the simulated session to the whole route tree. */
export function SessionRoot() {
  return (
    <SessionProvider>
      <Outlet />
    </SessionProvider>
  )
}

/** Layout guard: anonymous visitors go to /login; nothing renders while the session resolves. */
export function RequireSession() {
  const session = useSession()
  if (session.status === 'loading') {
    return <p className="text-muted-foreground p-6 text-sm">{es.loading}</p>
  }
  if (session.status === 'anonymous') return <Navigate to="/login" replace />
  return <Outlet />
}

function Forbidden({ role }: { role: Role }) {
  useEffect(() => {
    toast.error(es.errors.forbidden)
  }, [])
  return <Navigate to={homeFor(role)} replace />
}

/** Layout guard for one area; sends other roles to their home page. */
export function RequireArea({ area }: { area: AreaId }) {
  const session = useSession()
  if (session.status !== 'authenticated') return null
  if (!session.can(area)) return <Forbidden role={session.user.role} />
  return <Outlet />
}
