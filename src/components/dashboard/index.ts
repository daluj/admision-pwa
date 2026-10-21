export { DurationText } from './DurationText'
export { ExceptionList, type ExceptionItem } from './ExceptionList'
export { KpiStrip } from './KpiStrip'
export { KpiTile, type KpiTileProps } from './KpiTile'
export { BED_STATUS_STYLES, StatusBadge } from './StatusBadge'
export type { Severity } from './statusStyles'
export { TriageBadge } from './TriageBadge'
// TrendChart is imported from './TrendChart' directly: it pulls in Recharts, which must stay out
// of the chunks that load on every page.
