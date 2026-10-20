import { expect, test } from '@playwright/test'

const PAGES = [
  { label: 'Torre de control', path: '/', title: 'Visión general' },
  { label: 'Camas', path: '/camas', title: 'Gestión de camas' },
  { label: 'Urgencias', path: '/urgencias', title: 'Urgencias' },
  { label: 'Ingresos y altas', path: '/ingresos-altas', title: 'Ingresos y altas' },
  { label: 'Traslados', path: '/traslados', title: 'Traslados internos' },
  { label: 'Seguimiento', path: '/seguimiento', title: 'Seguimiento de pacientes' },
  { label: 'Ajustes', path: '/ajustes', title: 'Ajustes' },
] as const

test('navigates through every sidebar item', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Entorno de demostración — datos ficticios')).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Navegación principal' })

  for (const { label, path, title } of PAGES) {
    await nav.getByRole('link', { name: label, exact: true }).click()
    await expect(page).toHaveURL(path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
  }
})

test('unknown routes show the 404 page', async ({ page }) => {
  await page.goto('/no-existe')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página no encontrada')
})

test('serves the web app manifest', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    /manifest\.webmanifest/,
  )

  const response = await request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = (await response.json()) as Record<string, unknown>
  expect(manifest).toMatchObject({
    name: 'Torre de Control — Admisión',
    short_name: 'Torre Control',
    lang: 'es',
    display: 'standalone',
  })
})

test('registers a service worker and works offline', async ({ page, context }) => {
  await page.goto('/')
  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state ?? null),
    )
    .toBe('activated')

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Visión general')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Camas', exact: true })
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gestión de camas')
  await context.setOffline(false)
})
