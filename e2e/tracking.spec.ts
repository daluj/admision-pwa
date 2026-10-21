import { expect, test } from '@playwright/test'
import { loginAs } from './helpers.js'

test('search by NHC opens the journey with its timeline', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/seguimiento')
  await page.getByLabel('Buscar paciente').fill('SIM-')
  const results = page.getByRole('list', { name: 'Resultados de la búsqueda' })
  await expect(results.getByRole('listitem').first()).toBeVisible()

  await results.getByRole('link').first().click()
  await expect(page).toHaveURL(/\/seguimiento\/[^/?]+/)
  await expect(page.getByRole('list', { name: 'Línea de tiempo' })).toBeVisible()
  await expect(page.getByText('Ubicación actual:')).toBeVisible()

  await page.getByRole('link', { name: 'Volver a la búsqueda' }).click()
  await expect(page.getByLabel('Buscar paciente')).toHaveValue('SIM-')
})

test('a dashboard row links to the patient journey', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/urgencias')
  const link = page.getByRole('link', { name: /^Ver recorrido del paciente/ }).first()
  await expect(link).toBeVisible()
  await link.click()
  await expect(page.getByRole('list', { name: 'Línea de tiempo' })).toBeVisible()
})

test('porters have no Seguimiento', async ({ page }) => {
  await loginAs(page, 'Celador/a')
  await page.goto('/seguimiento')
  await expect(page).toHaveURL(/\/traslados$/)
})
