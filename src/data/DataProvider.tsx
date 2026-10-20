import type { ReactNode } from 'react'
import type { DataBackend } from '@/data/ports'
import { DataContext } from './dataContext'

type DataProviderProps = {
  /** Created once at startup by `createBackend()` (or a memory backend in tests). */
  backend: DataBackend
  children: ReactNode
}

/**
 * Provides the DataBackend to the tree. It does not own the backend's lifecycle: the backend lives
 * for the whole page (and StrictMode's double mount must not close it).
 */
export function DataProvider({ backend, children }: DataProviderProps) {
  return <DataContext.Provider value={backend}>{children}</DataContext.Provider>
}
