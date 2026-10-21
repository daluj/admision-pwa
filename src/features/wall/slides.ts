import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { AreaId } from '@/domain/access'

export type WallSlide = {
  area: AreaId
  Page: LazyExoticComponent<ComponentType>
}

/** The dashboards the wall display rotates through, in order; roles only get the ones they can open. */
export const WALL_SLIDES: readonly WallSlide[] = [
  { area: 'overview', Page: lazy(() => import('@/features/overview/OverviewPage')) },
  { area: 'beds', Page: lazy(() => import('@/features/beds/BedsPage')) },
  { area: 'emergency', Page: lazy(() => import('@/features/emergency/EmergencyPage')) },
  { area: 'admissions', Page: lazy(() => import('@/features/admissions/AdmissionsPage')) },
  { area: 'transfers', Page: lazy(() => import('@/features/transfers/TransfersPage')) },
]

/** Roles that can open the overview can use the wall display. */
export const WALL_AREA: AreaId = 'overview'
