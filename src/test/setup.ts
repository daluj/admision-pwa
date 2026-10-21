import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import type * as Recharts from 'recharts'
import { afterEach, vi } from 'vitest'

// jsdom gaps used by Radix primitives (menus, tooltips, sheets).
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
Element.prototype.scrollIntoView ??= function scrollIntoView() {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  document.documentElement.classList.remove('dark')
})

// jsdom has no layout, so Recharts' ResponsiveContainer would measure 0×0 and draw nothing.
// Give charts a fixed size in tests so the SVG (reference lines, labels) can be asserted.
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof Recharts>()
  return {
    ...original,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactElement<{ width?: number; height?: number }>
    }) => cloneElement(children, { width: 640, height: 240 }),
  }
})
