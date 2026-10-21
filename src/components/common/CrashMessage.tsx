import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { es } from '@/i18n/es'

const copy = es.crash

type CrashMessageProps = {
  error: unknown
  /** `page`: the whole app failed (full screen); otherwise it fills the main area of the layout. */
  variant?: 'page' | 'area'
  children: ReactNode
}

/** The Spanish "something failed" panel with the technical detail folded away. Actions are the children. */
export function CrashMessage({ error, variant = 'area', children }: CrashMessageProps) {
  const detail = error instanceof Error ? error.message : String(error)
  const page = variant === 'page'
  return (
    <div className={page ? 'flex min-h-dvh items-center justify-center p-6' : 'p-2'}>
      <div role="alert" className="bg-card max-w-lg rounded-lg border p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <TriangleAlert className="text-status-critical size-6" aria-hidden="true" />
          <h2 className="text-lg font-semibold">{page ? copy.pageTitle : copy.title}</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          {page ? copy.pageDescription : copy.description}
        </p>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer">{copy.detail}</summary>
          <code className="bg-muted mt-2 block rounded p-2 text-xs break-words">{detail}</code>
        </details>
        <div className="mt-4 flex flex-wrap gap-2">{children}</div>
      </div>
    </div>
  )
}
