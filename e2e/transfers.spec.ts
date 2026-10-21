import { expect, test } from '@playwright/test'
import { loginAs } from './helpers.js'

test('reserving a bed creates a transfer the head can assign to a porter', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/camas')
  await page
    .getByRole('button', { name: /^Asignar cama/ })
    .first()
    .click()
  const sheet = page.getByRole('dialog', { name: 'Asignar cama' })
  await sheet.getByRole('radio').first().check()
  await sheet.getByRole('button', { name: 'Reservar cama' }).click()
  await expect(page.getByText(/^Cama .+ reservada/)).toBeVisible()

  await page.goto('/traslados')
  await expect(page.getByRole('list', { name: 'Indicadores de traslados' })).toBeVisible()
  const queue = page.getByRole('table', { name: 'Cola de traslados' })
  const row = queue.locator('tr[data-status="REQUESTED"]').first()
  await expect(row).toBeVisible()
  const id = await row.getAttribute('data-transfer')

  await row.getByRole('button', { name: /^Asignar:/ }).click()
  const assign = page.getByRole('dialog', { name: 'Asignar celador' })
  await expect(assign.getByRole('radio').first()).toBeVisible()
  await assign.getByRole('button', { name: 'Asignar', exact: true }).click()

  await expect(assign).toBeHidden()
  await expect(queue.locator(`tr[data-transfer="${id}"]`)).toHaveAttribute(
    'data-status',
    'ASSIGNED',
  )
})

test('a porter sees Mi cola with their work and the open queue', async ({ page }) => {
  await loginAs(page, 'Celador/a')
  await page.goto('/traslados')
  await expect(page.getByRole('heading', { level: 1, name: 'Mi cola' })).toBeVisible()
  await expect(
    page
      .getByRole('list', { name: 'Mi trabajo' })
      .or(page.getByText('No tiene traslados asignados.')),
  ).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Cola abierta' })).toBeVisible()
})
