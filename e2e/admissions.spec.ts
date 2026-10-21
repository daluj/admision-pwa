import { expect, test, type Page } from '@playwright/test'
import { loginAs } from './helpers.js'

const kpis = (page: Page) => page.getByRole('list', { name: 'Indicadores de ingresos y altas' })
const tabs = (page: Page) =>
  page.getByRole('tablist', { name: 'Altas de los pacientes ingresados' })

test('the head sees the KPIs, the scheduled admissions, the discharges by unit and the balance', async ({
  page,
}) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/ingresos-altas')
  await expect(kpis(page).getByRole('listitem')).toHaveCount(6)

  const scheduled = page.getByRole('table', { name: 'Ingresos programados de hoy' })
  expect(await scheduled.locator('tbody tr').count()).toBeGreaterThanOrEqual(10)
  await expect(
    page.getByRole('table', { name: 'Altas por unidad' }).locator('tbody tr').first(),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 2, name: 'Previsión de balance de camas' }),
  ).toBeVisible()
  await expect(tabs(page).getByRole('tab', { selected: true })).toContainText('Previstas hoy')
})

test('the head orders a discharge and it moves to "Ordenadas"', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/ingresos-altas')
  const ordered = tabs(page).getByRole('tab', { name: /Ordenadas/ })
  const countOf = async () => Number(/\((\d+)\)/.exec((await ordered.innerText()) ?? '')?.[1])
  const before = await countOf()

  await page
    .getByRole('tabpanel')
    .getByRole('button', { name: /^Ordenar alta/ })
    .first()
    .click()
  const sheet = page.getByRole('dialog', { name: 'Ordenar alta' })
  await sheet.getByRole('button', { name: 'Ordenar alta' }).click()
  await expect(page.getByText(/^Alta ordenada · /)).toBeVisible()
  await expect(sheet).toBeHidden()
  await expect.poll(countOf).toBe(before + 1)
})

test('a nurse supervisor sees only their unit and can set an expected discharge there', async ({
  page,
}) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/ingresos-altas')
  const unit = (
    await page
      .getByRole('table', { name: 'Altas por unidad' })
      .locator('tbody tr th')
      .first()
      .innerText()
  ).trim()

  await page.evaluate(() => window.localStorage.removeItem('torre-control.session'))
  await loginAs(page, 'Supervisor/a de enfermería', unit)
  await page.goto('/ingresos-altas')
  await expect(page.getByText(`Mostrando solo: ${unit}`)).toBeVisible()
  await expect(
    page.getByRole('table', { name: 'Altas por unidad' }).locator('tbody tr'),
  ).toHaveCount(1)

  await tabs(page)
    .getByRole('tab', { name: /Sin fecha prevista/ })
    .click()
  const edit = page
    .getByRole('tabpanel')
    .getByRole('button', { name: /^Fijar alta prevista/ })
    .first()
  await expect(edit).toBeVisible()
  await edit.click()
  const sheet = page.getByRole('dialog', { name: 'Alta prevista' })
  await sheet.getByLabel('Día').selectOption('2')
  await sheet.getByLabel('Hora (24 h)').fill('11:00')
  await sheet.getByRole('button', { name: 'Guardar alta prevista' }).click()
  await expect(page.getByText(/^Alta prevista guardada · /)).toBeVisible()
  await expect(sheet).toBeHidden()
})

test('management sees the page but has no discharge buttons', async ({ page }) => {
  await loginAs(page, 'Dirección')
  await page.goto('/ingresos-altas')
  await expect(kpis(page).getByRole('listitem')).toHaveCount(6)
  await expect(page.getByRole('button', { name: /^Ordenar alta/ })).toHaveCount(0)
  await expect(page.getByRole('tabpanel').getByText('Solo lectura').first()).toBeVisible()
})
