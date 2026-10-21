import { FlaskConical, RadioTower } from 'lucide-react'
import { Navigate } from 'react-router'
import { EmptyState } from '@/components/common/EmptyState'
import { DemoBanner } from '@/components/layout/DemoBanner'
import { useUnits, useUsers } from '@/data/hooks'
import { homeFor } from '@/domain/access'
import { ROLES } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { RoleCard } from './RoleCard'
import { useSession } from './useSession'

export default function LoginPage() {
  const session = useSession()
  const users = useUsers()
  const units = useUnits()

  if (session.status === 'authenticated') {
    return <Navigate to={homeFor(session.user.role)} replace />
  }

  const ready = session.status === 'anonymous' && users !== undefined && units !== undefined
  const roles = ready ? ROLES.filter((role) => users.some((user) => user.role === role)) : []

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:py-12">
        <header className="mb-8 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <RadioTower className="text-primary size-7" aria-hidden="true" />
            <h1 className="text-2xl font-semibold">{es.login.title}</h1>
          </div>
          <p className="text-muted-foreground">{es.login.subtitle}</p>
          <p className="bg-status-warn text-status-warn-foreground inline-flex w-fit items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium">
            <FlaskConical className="size-4" aria-hidden="true" />
            {es.login.simulated}
          </p>
          <p className="text-muted-foreground text-sm">{es.login.simulatedHint}</p>
        </header>

        {!ready ? (
          <p className="text-muted-foreground text-sm">{es.login.loading}</p>
        ) : roles.length === 0 ? (
          <EmptyState title={es.login.emptyTitle} description={es.login.emptyDescription} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <li key={role} className="flex">
                <div className="flex w-full flex-col [&>*]:flex-1">
                  <RoleCard
                    role={role}
                    users={users.filter((user) => user.role === role)}
                    units={units}
                    onEnter={(user) => session.login(user.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
