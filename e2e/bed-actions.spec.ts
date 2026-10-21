import { expect, test, type Page } from '@playwright/test'
import { loginAs } from './helpers.js'

const requestList = (page: Page) => page.getByRole('list', { name: 'Solicitudes abiertas' })
const assignButtons = (page: Page) => page.getByRole('button', { name: /^Asignar cama/ })
const tiles = (page: Page, status: string) =>
  page.getByRole('region', { name: 'Mapa de camas' }).locator(`[data-status="${status}"]`)

test('the head assigns the most urgent request to a suggested bed', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/camas')
  await expect(requestList(page)).toBeVisible()
  const before = await requestList(page).getByRole('listitem').count()
  expect(before).toBeGreaterThan(0)

  await assignButtons(page).first().click()
  const sheet = page.getByRole('dialog', { name: 'Asignar cama' })
  await expect(sheet.getByRole('radio').first()).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Reservar cama' })).toBeDisabled()

  await sheet.getByRole('radio').first().check()
  await sheet.getByRole('button', { name: 'Reservar cama' }).click()

  await expect(page.getByText(/^Cama .+ reservada/)).toBeVisible()
  await expect(sheet).toBeHidden()
  await expect(requestList(page).getByRole('listitem')).toHaveCount(before - 1)

  // The event log shows who did it and what.
  await page.goto('/ajustes')
  const log = page.getByRole('table', { name: 'Registro de eventos' })
  // Reserving a bed also creates the transfer, by the same person.
  await expect(log.locator('tbody tr').first()).toContainText('Traslado solicitado')
  await expect(log.locator('tbody tr').nth(1)).toContainText('Cama reservada')
  await expect(log.locator('tbody tr').nth(1)).toContainText('Sergio Medina Reyes')
})

test('a free bed can be blocked with a reason and unblocked again', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/camas/MIN-3N')
  await expect(page.getByRole('region', { name: 'Mapa de camas' })).toBeVisible()

  const free = tiles(page, 'AVAILABLE').first()
  const label = (await free.locator('span').first().innerText()).trim()
  await free.click()
  const sheet = page.getByRole('dialog', { name: `Cama ${label}` })
  await sheet.getByLabel('Motivo del bloqueo').fill('Fuga de agua')
  await sheet.getByRole('button', { name: 'Bloquear cama' }).click()
  await expect(page.getByText(`Cama ${label} bloqueada`)).toBeVisible()

  const blocked = page
    .getByRole('region', { name: 'Mapa de camas' })
    .locator(`[data-status="BLOCKED"]`, { hasText: label })
  await expect(blocked).toContainText('Fuga de agua')
  await blocked.click()
  await page
    .getByRole('dialog', { name: `Cama ${label}` })
    .getByRole('button', { name: 'Desbloquear cama' })
    .click()
  await expect(page.getByText(`Cama ${label} desbloqueada`)).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Mapa de camas' })
      .locator('[data-status="AVAILABLE"]', { hasText: label }),
  ).toBeVisible()
})

test('a nurse supervisor can clean beds in their unit but not block them', async ({ page }) => {
  // Find a unit that has a bed waiting for cleaning.
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/camas')
  const dirtyCard = page
    .getByRole('region', { name: 'Unidades' })
    .getByRole('link')
    .filter({ hasText: /Pendiente de limpieza\s*\d/ })
    .first()
  await expect(dirtyCard).toBeVisible()
  const unit = (await dirtyCard.getByRole('heading', { level: 3 }).innerText()).trim()

  await page.evaluate(() => window.localStorage.removeItem('torre-control.session'))
  await loginAs(page, 'Supervisor/a de enfermería', unit)
  await expect(page).toHaveURL(/\/camas\/[^/]+$/)

  const dirty = tiles(page, 'PENDING_CLEANING').first()
  const label = (await dirty.locator('span').first().innerText()).trim()
  await dirty.click()
  const sheet = page.getByRole('dialog', { name: `Cama ${label}` })
  await expect(sheet.getByRole('button', { name: 'Bloquear cama' })).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Iniciar limpieza' }).click()
  await expect(page.getByText(`Cama ${label}: limpieza iniciada`)).toBeVisible()

  const cleaning = page
    .getByRole('region', { name: 'Mapa de camas' })
    .locator('[data-status="CLEANING"]', { hasText: label })
  await cleaning.click()
  await page
    .getByRole('dialog', { name: `Cama ${label}` })
    .getByRole('button', { name: 'Terminar limpieza' })
    .click()
  await expect(page.getByText(`Cama ${label}: limpieza terminada, disponible`)).toBeVisible()

  // A free bed is read-only for them.
  await tiles(page, 'AVAILABLE').first().click()
  await expect(page.getByText('Solo lectura: su rol no puede modificar esta cama.')).toBeVisible()
})

test('management sees requests and beds but has no action buttons', async ({ page }) => {
  await loginAs(page, 'Dirección')
  await page.goto('/camas')
  await expect(requestList(page)).toBeVisible()
  await expect(assignButtons(page)).toHaveCount(0)

  await page.goto('/camas/MIN-3N')
  await tiles(page, 'AVAILABLE').first().click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByText('Solo lectura: su rol no puede modificar esta cama.')).toBeVisible()
  await expect(
    sheet.getByRole('button', { name: /Bloquear|limpieza|Desbloquear|Liberar/ }),
  ).toHaveCount(0)
})

test('with the simulation running, the bed turnaround gets a value', async ({ page }) => {
  test.setTimeout(150_000)
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/camas')
  const tile = page
    .getByRole('list', { name: 'Indicadores de camas' })
    .getByRole('listitem')
    .filter({ hasText: 'Rotación de cama' })
  await expect(tile).toContainText('sin datos todavía')

  await page.getByRole('button', { name: /Velocidad de la simulación/ }).click()
  await page.getByRole('menuitemradio', { name: '300×' }).click()
  await page.getByRole('button', { name: 'Iniciar simulación' }).click()

  await expect(tile).not.toContainText('sin datos todavía', { timeout: 120_000 })
  await expect(tile).toContainText(/\d+ camas? hoy/)
  await page.getByRole('button', { name: 'Pausar simulación' }).click()
})
