import { TriangleAlert } from 'lucide-react'
import { es } from '@/i18n/es'

type StartupErrorProps = {
  error: unknown
}

/** Full-page error shown when the app cannot start (e.g. invalid data backend configuration). */
export function StartupError({ error }: StartupErrorProps) {
  const detail = error instanceof Error ? error.message : String(error)
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div role="alert" className="bg-card max-w-lg rounded-lg border p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <TriangleAlert className="text-status-critical size-6" aria-hidden="true" />
          <h1 className="text-lg font-semibold">{es.startupError.title}</h1>
        </div>
        <p className="text-muted-foreground text-sm">{es.startupError.description}</p>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer">{es.startupError.detail}</summary>
          <code className="bg-muted mt-2 block rounded p-2 text-xs break-words">{detail}</code>
        </details>
      </div>
    </main>
  )
}
