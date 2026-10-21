import { expect, test, type Page } from '@playwright/test'
import { loginAs } from './helpers.js'

const kpis = (page: Page) => page.getByRole('list', { name: 'Indicadores de Urgencias' })
const board = (page: Page) => page.getByRole('region', { name: 'Tablero de Urgencias' })

test('the head sees the ED dashboard: six KPIs, four columns, boarding list and chart', async ({
  page,
}) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/urgencias')
  await expect(kpis(page).getByRole('listitem')).toHaveCount(6)

  // Seeded with about 40 patients present, in four columns.
  await expect(board(page).getByRole('heading', { level: 3 })).toHaveCount(4)
  await expect(page.locator('[data-phase] [data-visit]').first()).toBeVisible()
  expect(await page.locator('[data-phase] [data-visit]').count()).toBeGreaterThanOrEqual(25)
  await expect(page.locator('[data-phase="ADMIT_DECISION"] [data-visit]').first()).toBeVisible()

  // Every triaged card shows the Manchester level as a number.
  const badges = page.locator('[data-phase="TRIAGED"] [data-level]').first()
  await expect(badges).toHaveText(/[1-5]/)

  const boarding = page.getByRole('table', { name: 'Pendientes de ingreso' })
  await expect(boarding.locator('tbody tr').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Gestionar en Camas' })).toBeVisible()

  const chart = page.getByRole('table', { name: 'Atendidos en objetivo por hora (últimas 24 h)' })
  await expect(chart.locator('tbody tr')).toHaveCount(24)
  await expect(
    page
      .getByRole('figure', { name: /Atendidos en objetivo/ })
      .locator('svg')
      .first(),
  ).toBeVisible()
})

test('patient names and NHC stay out of the cards', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/urgencias')
  await expect(page.locator('[data-visit]').first()).toBeVisible()
  expect(await page.locator('main').innerText()).not.toMatch(/SIM-\d/)
})

test('with the simulation running, the ED numbers change', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/urgencias')
  const before = await kpis(page).innerText()

  await page.getByRole('button', { name: /Velocidad de la simulación/ }).click()
  await page.getByRole('menuitemradio', { name: '300×' }).click()
  await page.getByRole('button', { name: 'Iniciar simulación' }).click()

  await expect.poll(() => kpis(page).innerText(), { timeout: 45_000 }).not.toBe(before)
  await page.getByRole('button', { name: 'Pausar simulación' }).click()
})

test('the ED coordinator lands on Urgencias and has no link to manage beds', async ({ page }) => {
  await loginAs(page, 'Coordinación de Urgencias')
  await expect(page).toHaveURL(/\/urgencias$/)
  await expect(kpis(page).getByRole('listitem')).toHaveCount(6)
  await expect(page.getByRole('table', { name: 'Pendientes de ingreso' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Gestionar en Camas' })).toHaveCount(0)
})
