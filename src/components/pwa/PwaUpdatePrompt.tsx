import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { es } from '@/i18n/es'

/** Registers the service worker and surfaces "update available" / "offline ready" toasts. */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!offlineReady) return
    toast.success(es.pwa.offlineReady, { onDismiss: () => setOfflineReady(false) })
  }, [offlineReady, setOfflineReady])

  useEffect(() => {
    if (!needRefresh) return
    toast.info(es.pwa.updateAvailable, {
      id: 'pwa-update',
      description: es.pwa.updateDescription,
      duration: Infinity,
      action: { label: es.pwa.updateAction, onClick: () => void updateServiceWorker(true) },
      onDismiss: () => setNeedRefresh(false),
    })
  }, [needRefresh, setNeedRefresh, updateServiceWorker])

  return null
}
