import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { es } from '@/i18n/es'
import { DemoBanner } from './DemoBanner'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {es.app.skipToContent}
      </a>
      <DemoBanner />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main
            id="main"
            tabIndex={-1}
            className="flex-1 overflow-y-auto overscroll-contain p-4 focus:outline-none md:p-6"
          >
            <Suspense fallback={<p className="text-muted-foreground text-sm">{es.loading}</p>}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}
