import { createContext } from 'react'
import type { AreaId } from '@/domain/access'
import type { User } from '@/domain/schemas'

export type SessionState =
  | { status: 'loading' }
  | { status: 'anonymous'; login: (userId: string) => void }
  | {
      status: 'authenticated'
      user: User
      can: (area: AreaId) => boolean
      logout: () => void
    }

export const SessionContext = createContext<SessionState | null>(null)
