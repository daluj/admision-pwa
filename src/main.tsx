import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import { StartupError } from '@/components/common/StartupError'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { createBackend } from '@/data/createBackend'
import { DataProvider } from '@/data/DataProvider'
import { ensureDemoSeeded } from '@/simulator'
import '@/styles/globals.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

function boot(): ReactNode {
  try {
    const backend = createBackend()
    // First launch: load the synthetic hospital in the background; the UI updates live.
    ensureDemoSeeded(backend).catch((error: unknown) => console.error('Demo seed failed', error))
    return (
      <DataProvider backend={backend}>
        <App />
      </DataProvider>
    )
  } catch (error) {
    console.error(error)
    return <StartupError error={error} />
  }
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>{boot()}</ThemeProvider>
  </StrictMode>,
)
