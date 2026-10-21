import { z } from 'zod'

export const SESSION_STORAGE_KEY = 'torre-control.session'

const StoredSession = z.object({ userId: z.string().min(1) })

/** Simulated session: only the user id is stored. Storage can be unavailable or corrupt. */
export function readSession(): string | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (raw === null) return null
    const parsed = StoredSession.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data.userId : null
  } catch {
    return null
  }
}

export function writeSession(userId: string): void {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId }))
  } catch {
    // Storage unavailable: the session only lasts until reload.
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}
