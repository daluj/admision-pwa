import { expect, test, type Page } from '@playwright/test'
import { loginAs } from './helpers.js'

const PAGES = [
  { label: 'Torre de control', path: '/', title: 'Visión general' },
  { label: 'Camas', path: '/camas', title: 'Gestión de camas' },
  { label: 'Urgencias', path: '/urgencias', title: 'Urgencias' },
  { label: 'Ingresos y altas', path: '/ingresos-altas', title: 'Ingresos y altas' },
  { label: 'Traslados', path: '/traslados', title: 'Traslados internos' },
  { label: 'Seguimiento', path: '/seguimiento', title: 'Seguimiento de pacientes' },
  { label: 'Ajustes', path: '/ajustes', title: 'Ajustes' },
] as const

/** A fresh demo: the log was wiped (seed event + the first alerts only), not carrying old activity. */
async function expectFreshLog(page: Page) {
  await expect
    .poll(async () => Number(await db(page, 'Eventos registrados').textContent()))
    .toBeLessThan(60)
}

test('navigates through every sidebar item', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
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
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/no-existe')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página no encontrada')
})

test('the chosen theme survives a reload', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.getByRole('button', { name: 'Cambiar tema' }).click()
  await page.getByRole('menuitemradio', { name: 'Oscuro' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#141922')
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
  await loginAs(page, 'Jefe/a de Admisión')
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

const cardValue = (page: Page, card: string, label: string) =>
  page
    .locator('[data-slot="card"]', { hasText: card })
    .locator('dt', { hasText: new RegExp(`^${label}$`) })
    .locator('xpath=following-sibling::dd[1]')

const db = (page: Page, label: string) => cardValue(page, 'Base de datos local', label)

test('first launch seeds the demo hospital; Ajustes shows the database status', async ({
  page,
  context,
}) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/ajustes')
  await expect(db(page, 'Origen de datos')).toHaveText('IndexedDB')
  await expect(db(page, 'Versión del esquema')).toHaveText('1')
  await expectFreshLog(page)
  await expect(db(page, 'Camas')).toHaveText('600')
  await expect(db(page, 'Unidades')).toHaveText('20')
  await expect(cardValue(page, 'Datos de demostración', 'Semilla actual')).toHaveText('42')

  const databases = await page.evaluate(async () =>
    (await indexedDB.databases()).map((database) => database.name),
  )
  expect(databases).toContain('torre-control')

  // Reload does not seed again.
  await page.reload()
  await expect(db(page, 'Camas')).toHaveText('600')
  await expectFreshLog(page)

  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state ?? null),
    )
    .toBe('activated')
  await context.setOffline(true)
  await page.reload()
  await expect(db(page, 'Origen de datos')).toHaveText('IndexedDB')
  await expect(db(page, 'Camas')).toHaveText('600')
  await context.setOffline(false)
})

test('"Restablecer demo" reseeds, signs out and updates every open tab', async ({
  page,
  context,
}) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/ajustes')
  await expect(db(page, 'Camas')).toHaveText('600')

  const other = await context.newPage()
  await other.goto('/ajustes')
  await expect(cardValue(other, 'Datos de demostración', 'Semilla actual')).toHaveText('42')

  const reset = async (seed: string) => {
    await page.getByLabel('Semilla').fill(seed)
    await page.getByRole('button', { name: 'Restablecer demo' }).click()
    const dialog = page.getByRole('alertdialog', { name: '¿Restablecer la demo?' })
    await expect(dialog).toContainText(`con la semilla ${seed}`)
    await dialog.getByRole('button', { name: 'Restablecer', exact: true }).click()
  }

  // The simulated users are regenerated, so every tab falls back to the login page.
  await reset('7')
  await expect(page).toHaveURL(/\/login$/)
  await expect(other).toHaveURL(/\/login$/)

  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/ajustes')
  await other.goto('/ajustes')
  await expect(cardValue(page, 'Datos de demostración', 'Semilla actual')).toHaveText('7')
  await expect(cardValue(other, 'Datos de demostración', 'Semilla actual')).toHaveText('7')
  await expectFreshLog(other)
  // Counts are fixed by the profile (same for every seed); the content differs.
  await expect(db(other, 'Camas')).toHaveText('600')

  await reset('42')
  await expect(page).toHaveURL(/\/login$/)
  await loginAs(page, 'Jefe/a de Admisión')
  await other.goto('/ajustes')
  await expectFreshLog(other)
  await expect(cardValue(other, 'Datos de demostración', 'Semilla actual')).toHaveText('42')
})
