import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import type { DataBackend } from '@/data/ports'

/** Renders the full route tree in memory at `path`, with an in-memory data backend. */
export function renderApp(path = '/', backend: DataBackend = createMemoryBackend()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const result = render(
    <ThemeProvider>
      <DataProvider backend={backend}>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </DataProvider>
    </ThemeProvider>,
  )
  return { ...result, router, backend }
}
