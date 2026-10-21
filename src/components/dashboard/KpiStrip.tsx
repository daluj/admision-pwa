import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type KpiStripProps = {
  label: string
  /** Number of tiles the strip is laid out for: 6 → 3 → 2 columns, 7 → 4 → 2, 5 → 3 → 2 or 4 → 4 → 2. */
  size?: 4 | 5 | 6 | 7
  children: ReactNode
}

const LAYOUT = {
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-3 xl:grid-cols-5',
  6: 'md:grid-cols-3 xl:grid-cols-6',
  7: 'md:grid-cols-4 2xl:grid-cols-7',
} as const

/** Responsive KPI row. Children are `KpiTile`s. */
export function KpiStrip({ label, size = 6, children }: KpiStripProps) {
  return (
    <ul aria-label={label} className={cn('mb-6 grid grid-cols-2 gap-3', LAYOUT[size])}>
      {children}
    </ul>
  )
}
