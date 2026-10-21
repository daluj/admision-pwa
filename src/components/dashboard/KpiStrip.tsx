import type { ReactNode } from 'react'

/** Responsive KPI row: 6 → 3 → 2 columns. Children are `KpiTile`s. */
export function KpiStrip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {children}
    </ul>
  )
}
