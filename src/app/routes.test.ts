import { matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { NAV_ITEMS } from '@/components/layout/nav'
import { es } from '@/i18n/es'
import { routes } from './routes'

describe('navigation config', () => {
  it.each(NAV_ITEMS)('$id has a route and an es.ts label', (item) => {
    const matches = matchRoutes(routes, item.path)
    const leaf = matches?.at(-1)?.route
    expect(leaf).toBeDefined()
    expect(leaf?.path).not.toBe('*')
    expect(leaf?.lazy).toBeTypeOf('function')

    expect(es.nav.items[item.labelKey]).toEqual(expect.any(String))
    expect(es.nav.items[item.labelKey].length).toBeGreaterThan(0)
  })

  it('has unique paths', () => {
    const paths = NAV_ITEMS.map((item) => item.path)
    expect(new Set(paths).size).toBe(paths.length)
  })
})
