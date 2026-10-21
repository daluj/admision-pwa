import { useState } from 'react'
import { toast } from 'sonner'
import { useDataBackend } from '@/data/dataContext'
import { useSimulationState } from '@/data/hooks'
import { es } from '@/i18n/es'
import { DEFAULT_SEED, resetDemo } from '@/simulator'
import { DemoDataCard } from './DemoDataCard'

const copy = es.pages.settings.demo

/** Container: live simulator state + the reset action with toasts. */
export function DemoDataSection() {
  const backend = useDataBackend()
  const state = useSimulationState()
  const [busy, setBusy] = useState(false)

  const onReset = async (seed: number, scenarioId: string) => {
    setBusy(true)
    try {
      await resetDemo(backend, seed, undefined, scenarioId)
      toast.success(copy.success(seed))
    } catch (error) {
      console.error(error)
      toast.error(copy.failure)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DemoDataCard
      currentSeed={state === undefined ? undefined : (state?.seed ?? null)}
      startedAt={state === undefined ? undefined : (state?.startedAt ?? null)}
      currentScenario={state === undefined ? undefined : (state?.scenarioId ?? null)}
      fallbackSeed={DEFAULT_SEED}
      busy={busy}
      onReset={(seed, scenarioId) => void onReset(seed, scenarioId)}
    />
  )
}
