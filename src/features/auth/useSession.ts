import { useContext } from 'react'
import { SessionContext, type SessionState } from './sessionContext'

export function useSession(): SessionState {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used inside <SessionProvider>')
  return session
}

/** The authenticated user; throws when called outside a guarded route. */
export function useCurrentUser() {
  const session = useSession()
  if (session.status !== 'authenticated') throw new Error('No authenticated user')
  return session
}
