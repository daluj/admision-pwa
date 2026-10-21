import { ChevronLeft, ChevronRight, Maximize, Minimize, Pause, Play, X } from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { SimClock } from '@/components/layout/SimClock'
import { NAV_ITEMS } from '@/components/layout/nav'
import { Button } from '@/components/ui/button'
import { StatusLevelBadge } from '@/features/alerts/StatusLevelBadge'
import { useAlertConfig } from '@/features/alerts/useAlertConfig'
import { useVisibleAlerts } from '@/features/alerts/useVisibleAlerts'
import { useSession } from '@/features/auth/useSession'
import { es } from '@/i18n/es'
import { cn } from '@/lib/utils'
import { WALL_SLIDES } from './slides'

const copy = es.wall

function useFullscreen() {
  const [active, setActive] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  )
  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const toggle = useCallback(() => {
    const request = document.fullscreenElement
      ? document.exitFullscreen?.()
      : document.documentElement.requestFullscreen?.()
    // Browsers may refuse (no user gesture, iframe): the wall works without it.
    void Promise.resolve(request).catch(() => undefined)
  }, [])
  return { active, toggle }
}

/**
 * `/pantalla`: the dashboards the role can open, full screen and dark, rotating every N seconds
 * (Ajustes). Pause with space or the button, ← → to move, F for full screen, Esc to leave.
 */
export default function WallPage() {
  const session = useSession()
  const config = useAlertConfig()
  const alerts = useVisibleAlerts()
  const navigate = useNavigate()
  const fullscreen = useFullscreen()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const slides = WALL_SLIDES.filter(
    (slide) => session.status === 'authenticated' && session.can(slide.area),
  )
  const count = slides.length
  const current = slides[Math.min(index, Math.max(count - 1, 0))]

  const go = useCallback(
    (step: number) => setIndex((i) => (count === 0 ? 0 : (i + step + count) % count)),
    [count],
  )
  const exit = useCallback(() => void navigate('/'), [navigate])

  // Rotation: one timer per slide, so any manual move or resume restarts the countdown.
  useEffect(() => {
    if (paused || count < 2) return
    const timer = setTimeout(() => go(1), config.wallRotationSec * 1000)
    return () => clearTimeout(timer)
  }, [paused, count, index, go, config.wallRotationSec])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return // browser shortcuts stay the browser's
      const target = event.target as HTMLElement | null
      if (target && /^(input|select|textarea)$/i.test(target.tagName)) return
      switch (event.key) {
        case 'ArrowRight':
          go(1)
          break
        case 'ArrowLeft':
          go(-1)
          break
        case ' ':
          if (target?.tagName === 'BUTTON') return // let the focused button handle its own press
          event.preventDefault()
          setPaused((p) => !p)
          break
        case 'f':
        case 'F':
          fullscreen.toggle()
          break
        case 'Escape':
          if (!document.fullscreenElement) exit()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, exit, fullscreen])

  if (!current) return null
  const label = es.nav.items[NAV_ITEMS.find((item) => item.id === current.area)!.labelKey]
  const Page = current.Page

  return (
    // `zoom` scales the whole dashboard for reading from a distance; `dark` forces the dark tokens.
    <div
      data-wall
      className="dark bg-background text-foreground fixed inset-0 z-50 flex flex-col overflow-hidden"
    >
      <header
        className="flex flex-wrap items-center gap-3 border-b px-4 py-2"
        style={{ zoom: 1.25 }}
      >
        <h1 className="text-lg font-semibold">{copy.title}</h1>
        <StatusLevelBadge />
        <SimClock />
        <span className="text-muted-foreground text-sm" role="status">
          {copy.pending(alerts?.unacknowledged ?? 0)}
        </span>
        <nav aria-label={copy.slides} className="mx-auto flex items-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.area}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={copy.slide(
                i + 1,
                count,
                es.nav.items[NAV_ITEMS.find((item) => item.id === slide.area)!.labelKey],
              )}
              aria-current={slide === current ? 'true' : undefined}
              className={cn(
                'focus-visible:ring-ring size-3 rounded-full border focus-visible:ring-2 focus-visible:outline-none',
                slide === current ? 'bg-primary border-primary' : 'bg-transparent',
              )}
            />
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground mr-2 hidden text-xs xl:inline">
            {paused ? copy.paused : copy.rotating(config.wallRotationSec)}
          </span>
          <Button variant="ghost" size="icon" onClick={() => go(-1)} aria-label={copy.previous}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? copy.play : copy.pause}
            aria-pressed={paused}
          >
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => go(1)} aria-label={copy.next}>
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fullscreen.toggle}
            aria-label={fullscreen.active ? copy.exitFullscreen : copy.fullscreen}
          >
            {fullscreen.active ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={exit} aria-label={copy.exit}>
            <X aria-hidden="true" />
          </Button>
        </div>
      </header>
      <main
        aria-label={copy.slide(Math.min(index, count - 1) + 1, count, label)}
        className="min-h-0 flex-1 overflow-y-auto p-6"
        style={{ zoom: 1.25 }}
      >
        <Suspense fallback={<p className="text-muted-foreground text-sm">{copy.loading}</p>}>
          <Page />
        </Suspense>
      </main>
      <p className="text-muted-foreground px-4 pb-2 text-center text-xs">{copy.keys}</p>
    </div>
  )
}
