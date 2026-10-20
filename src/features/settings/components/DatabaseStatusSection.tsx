import { useDataInfo, useTableCounts } from '@/data/hooks'
import { DatabaseStatusCard } from './DatabaseStatusCard'

/** Container: wires live data hooks to the presentational card. */
export function DatabaseStatusSection() {
  const info = useDataInfo()
  const counts = useTableCounts()
  return <DatabaseStatusCard info={info} counts={counts} />
}
