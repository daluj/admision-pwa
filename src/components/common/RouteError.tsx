import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'
import { es } from '@/i18n/es'
import { CrashMessage } from './CrashMessage'

/**
 * `errorElement` of the page routes: a page that crashes (or whose code fails to load) shows this
 * inside the layout, so the sidebar, the top bar and the other pages keep working.
 */
export function RouteError({ variant = 'area' }: { variant?: 'page' | 'area' }) {
  const error = useRouteError()
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    console.error('[route crash]', error)
  }, [error])

  return (
    <CrashMessage error={error} variant={variant}>
      {/* A new location key makes the router render the route again. */}
      <Button
        onClick={() => void navigate(`${location.pathname}${location.search}`, { replace: true })}
      >
        {es.crash.retry}
      </Button>
      <Button asChild variant="outline">
        <Link to="/">{es.crash.home}</Link>
      </Button>
    </CrashMessage>
  )
}
