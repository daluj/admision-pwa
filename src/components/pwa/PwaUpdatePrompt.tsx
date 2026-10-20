import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { es } from '@/i18n/es'

/** How often a long-lived tab (e.g. a wall display) checks for a new version. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * vite-plugin-pwa only reloads after "Actualizar" when a service worker already controlled the page
 * at registration. In the first session after install it did not, so we reload ourselves.
 */
const controlledAtLoad =
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    ? navigator.serviceWorker.controller !== null
    : true

function applyUpdate(updateServiceWorker: (reloadPage?: boolean) => Promise<void>): void {
  if (!controlledAtLoad) {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    })
  }
  void updateServiceWorker(true)
}

function watchForUpdates(registration: ServiceWorkerRegistration): void {
  const check = () => {
    if (navigator.onLine) void registration.update().catch(() => {})
  }
  window.setInterval(check, UPDATE_CHECK_INTERVAL_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
}

/** Registers the service worker and surfaces "update available" / "offline ready" toasts. */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, registration) => {
      if (registration) watchForUpdates(registration)
    },
  })

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
      action: { label: es.pwa.updateAction, onClick: () => applyUpdate(updateServiceWorker) },
      onDismiss: () => setNeedRefresh(false),
    })
  }, [needRefresh, setNeedRefresh, updateServiceWorker])

  return null
}
