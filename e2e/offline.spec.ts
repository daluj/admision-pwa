import { expect, test } from '@playwright/test'
import { loginAs } from './helpers.js'

const ROUTES = [
  { path: '/', heading: 'Visión general' },
  { path: '/camas', heading: 'Gestión de camas' },
  { path: '/urgencias', heading: 'Urgencias' },
  { path: '/ingresos-altas', heading: 'Ingresos y altas' },
  { path: '/traslados', heading: 'Traslados internos' },
  { path: '/seguimiento', heading: 'Seguimiento de pacientes' },
  { path: '/ajustes', heading: 'Ajustes' },
  { path: '/pantalla', heading: 'Modo pantalla' },
] as const

test('every route opens offline after one visit, with the data already in the browser', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000)
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/camas')
  await expect(page.getByRole('list', { name: 'Indicadores de camas' })).toBeVisible()

  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state ?? null),
    )
    .toBe('activated')
  // The app shell is precached: a reload lets the activated worker take control of the page.
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  for (const route of ROUTES) {
    await page.goto(route.path)
    await expect(
      page.getByRole('heading', { level: 1, name: route.heading }),
      `${route.path} offline`,
    ).toBeVisible({ timeout: 15_000 })
  }

  // Data comes from IndexedDB, not the network.
  await page.goto('/camas')
  await expect(
    page.getByRole('list', { name: 'Indicadores de camas' }).getByRole('listitem'),
  ).toHaveCount(7)
  await page.goto('/seguimiento')
  await page.getByLabel('Buscar paciente').fill('SIM-')
  await expect(
    page.getByRole('list', { name: 'Resultados de la búsqueda' }).getByRole('listitem').first(),
  ).toBeVisible()
  await context.setOffline(false)
})

test('the web app manifest and icons are valid for installation', async ({ page, request }) => {
  await page.goto('/login')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()
  const manifest = await (await request.get(href!)).json()
  expect(manifest).toMatchObject({ display: 'standalone', lang: 'es', start_url: '/', scope: '/' })
  const sizes = manifest.icons.map(
    (i: { sizes: string; purpose?: string }) => `${i.sizes}${i.purpose ? ':' + i.purpose : ''}`,
  )
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512', '512x512:maskable']))
  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok(), icon.src).toBe(true)
  }
  // iOS (Add to Home Screen) reads these.
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1)
  expect(await page.locator('meta[name="theme-color"]').count()).toBeGreaterThan(0)
})
