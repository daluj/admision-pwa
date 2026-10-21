import { expect, test, type Page } from '@playwright/test'
import { loginAs } from './helpers.js'

const nav = (page: Page) => page.getByRole('navigation', { name: 'Navegación principal' })

test('anonymous visitors are sent to the simulated login', async ({ page }) => {
  await page.goto('/camas')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Acceso simulado — sin contraseña')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(6)
})

test('the head of admissions sees every area and can log out', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await expect(nav(page).getByRole('link')).toHaveCount(7)

  await page.getByRole('button', { name: 'Menú de usuario' }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.goto('/camas')
  await expect(page).toHaveURL(/\/login$/)
})

test('management cannot open settings', async ({ page }) => {
  await loginAs(page, 'Dirección')
  await expect(nav(page).getByRole('link')).toHaveCount(6)
  await expect(nav(page).getByRole('link', { name: 'Ajustes' })).toHaveCount(0)
})

test('a porter only sees transfers; forbidden pages redirect with a toast', async ({ page }) => {
  await loginAs(page, 'Celador/a')
  await expect(page).toHaveURL(/\/traslados$/)
  await expect(nav(page).getByRole('link')).toHaveCount(1)

  await page.goto('/ajustes')
  await expect(page).toHaveURL(/\/traslados$/)
  await expect(page.getByText('No tienes acceso a esa sección')).toBeVisible()
})

test('a nurse supervisor is scoped to the chosen unit; the session survives a reload', async ({
  page,
}) => {
  await page.goto('/login')
  const card = page.locator('[data-slot="card"]', {
    has: page.getByRole('heading', { level: 2, name: 'Supervisor/a de enfermería' }),
  })
  const unitSelect = card.getByLabel('Unidad')
  const unit = await unitSelect.locator('option').nth(2).innerText()
  await loginAs(page, 'Supervisor/a de enfermería', unit)

  // Camas sends supervisors straight to their own unit's bed map.
  await expect(page).toHaveURL(/\/camas\/[^/]+$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(unit)
  await expect(nav(page).getByRole('link')).toHaveCount(3)

  await page.reload()
  await expect(page).toHaveURL(/\/camas\/[^/]+$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(unit)
})
