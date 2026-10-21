import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { es } from '@/i18n/es'
import { CrashMessage } from './CrashMessage'

type State = { error: unknown; failed: boolean }

/** Last line of defence: a crash anywhere below shows a message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, failed: false }

  static getDerivedStateFromError(error: unknown): State {
    return { error, failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Console only: there is no telemetry in the MVP.
    console.error('[app crash]', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <CrashMessage error={this.state.error} variant="page">
        <Button onClick={() => window.location.reload()}>{es.crash.reload}</Button>
      </CrashMessage>
    )
  }
}
