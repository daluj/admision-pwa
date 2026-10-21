import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useUsers } from '@/data/hooks'
import { canAccess, type AreaId } from '@/domain/access'
import { SessionContext, type SessionState } from './sessionContext'
import { clearSession, readSession, writeSession } from './sessionStorage'

/** Simulated session: a user id in localStorage, resolved against the users table. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const users = useUsers()
  const [userId, setUserId] = useState<string | null>(readSession)

  const user = useMemo(
    () => (userId && users ? (users.find((candidate) => candidate.id === userId) ?? null) : null),
    [userId, users],
  )

  // The user vanished (e.g. "Restablecer demo" with another seed): drop the stale session.
  const stale = userId !== null && users !== undefined && user === null
  useEffect(() => {
    if (stale) clearSession()
  }, [stale])

  const login = useCallback((id: string) => {
    writeSession(id)
    setUserId(id)
  }, [])
  const logout = useCallback(() => {
    clearSession()
    setUserId(null)
  }, [])

  const value = useMemo<SessionState>(() => {
    if (user) {
      return {
        status: 'authenticated',
        user,
        can: (area: AreaId) => canAccess(user.role, area),
        logout,
      }
    }
    if (users === undefined) return { status: 'loading' }
    return { status: 'anonymous', login }
  }, [user, users, login, logout])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
