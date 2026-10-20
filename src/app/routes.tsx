import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { NAV_ITEMS, type AreaId } from '@/components/layout/nav'

type PageModule = { default: ComponentType }

/** One lazy-loaded page per nav area. The Record type forces a page for every AreaId. */
export const PAGE_LOADERS: Record<AreaId, () => Promise<PageModule>> = {
  overview: () => import('@/features/overview/OverviewPage'),
  beds: () => import('@/features/beds/BedsPage'),
  emergency: () => import('@/features/emergency/EmergencyPage'),
  admissions: () => import('@/features/admissions/AdmissionsPage'),
  transfers: () => import('@/features/transfers/TransfersPage'),
  tracking: () => import('@/features/tracking/TrackingPage'),
  settings: () => import('@/features/settings/SettingsPage'),
}

function lazyPage(load: () => Promise<PageModule>): RouteObject['lazy'] {
  return async () => ({ Component: (await load()).default })
}

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: AppShell,
    children: [
      ...NAV_ITEMS.map((item): RouteObject =>
        item.path === '/'
          ? { index: true, lazy: lazyPage(PAGE_LOADERS[item.id]) }
          : { path: item.path.slice(1), lazy: lazyPage(PAGE_LOADERS[item.id]) },
      ),
      { path: '*', lazy: lazyPage(() => import('@/features/not-found/NotFoundPage')) },
    ],
  },
]
