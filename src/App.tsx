import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { PwaUpdatePrompt } from '@/components/pwa/PwaUpdatePrompt'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const router = createBrowserRouter(routes)

export function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" />
      <PwaUpdatePrompt />
    </TooltipProvider>
  )
}
