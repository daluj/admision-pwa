import { useCallback, useState } from 'react'
import { readFilters, writeFilters, type BedFilters } from './bedFilters'

/** The census filters of one user, remembered between visits. */
export function useBedFilters(userId: string): [BedFilters, (filters: BedFilters) => void] {
  const [filters, setFilters] = useState(() => readFilters(userId))
  const update = useCallback(
    (next: BedFilters) => {
      writeFilters(userId, next)
      setFilters(next)
    },
    [userId],
  )
  return [filters, update]
}
