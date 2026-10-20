import { createContext, useContext } from 'react'
import type { DataBackend } from '@/data/ports'

export const DataContext = createContext<DataBackend | null>(null)

/** The app's DataBackend. Hooks use this; components use the hooks in `src/data/hooks/`. */
export function useDataBackend(): DataBackend {
  const backend = useContext(DataContext)
  if (!backend) throw new Error('useDataBackend must be used inside <DataProvider>')
  return backend
}
