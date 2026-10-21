import { expect, test, type Page } from '@playwright/test'
import { loginAs } from './helpers.js'

const kpis = (page: Page) => page.getByRole('list', { name: 'Indicadores de camas' })
const unitCards = (page: Page) => page.getByRole('region', { name: 'Unidades' }).getByRole('link')

test('the census shows six KPIs and a card for every unit with beds', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/camas')
  await expect(kpis(page).getByRole('listitem')).toHaveCount(6)

  // Seeded at ~85 % occupancy.
  const occupancy = kpis(page).getByRole('listitem').first()
  await expect(occupancy).toContainText('Ocupación')
  await expect(occupancy).toContainText(/8[3-7]\s*%/)

  expect(await unitCards(page).count()).toBeGreaterThanOrEqual(18)
  await expect(page.getByText('Necesita atención')).toBeVisible()
})

test('filters narrow the grid and are remembered after a reload', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/camas')
  await expect(unitCards(page).first()).toBeVisible()
  const all = await unitCards(page).count()

  await page.getByLabel('Tipo de unidad').selectOption({ label: 'UCI' })
  await expect.poll(() => unitCards(page).count()).toBeLessThan(all)
  const filtered = await unitCards(page).count()
  expect(filtered).toBeGreaterThan(0)
  expect(filtered).toBeLessThan(all)

  await page.reload()
  await expect(page.getByLabel('Tipo de unidad')).toHaveValue('ICU')
  await expect(unitCards(page)).toHaveCount(filtered)

  await page.getByRole('button', { name: 'Quitar filtros' }).click()
  await expect(unitCards(page)).toHaveCount(all)
})

test('a unit opens its bed map with a tile per bed and the legend', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/camas')
  await unitCards(page).first().click()
  await expect(page).toHaveURL(/\/camas\/[^/]+$/)

  const map = page.getByRole('region', { name: 'Mapa de camas' })
  expect(await map.getByRole('button').count()).toBeGreaterThanOrEqual(10)
  await expect(page.getByRole('list', { name: 'Leyenda' }).getByRole('listitem')).toHaveCount(6)
  await expect(map.locator('[data-status="OCCUPIED"]').first()).toContainText(/Estancia/)

  await page.getByRole('link', { name: 'Todas las unidades' }).click()
  await expect(page).toHaveURL(/\/camas$/)
})

test('running the simulation changes the census', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/camas')
  const before = await kpis(page).innerText()

  await page.getByRole('button', { name: /Velocidad de la simulación/ }).click()
  await page.getByRole('menuitemradio', { name: '300×' }).click()
  await page.getByRole('button', { name: 'Iniciar simulación' }).click()

  await expect.poll(() => kpis(page).innerText(), { timeout: 45_000 }).not.toBe(before)
  await page.getByRole('button', { name: 'Pausar simulación' }).click()
})

test('a nurse supervisor lands on their unit and cannot see another', async ({ page }) => {
  await page.goto('/login')
  const card = page.locator('[data-slot="card"]', {
    has: page.getByRole('heading', { level: 2, name: 'Supervisor/a de enfermería' }),
  })
  const unit = await card.getByLabel('Unidad').locator('option').nth(2).innerText()
  await loginAs(page, 'Supervisor/a de enfermería', unit)

  await expect(page).toHaveURL(/\/camas\/[^/]+$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(unit)
  await expect(page.getByRole('link', { name: 'Todas las unidades' })).toHaveCount(0)
  const own = new URL(page.url()).pathname

  await page.goto('/camas')
  await expect(page).toHaveURL(new RegExp(`${own}$`))
  await page.goto('/camas/NO-EXISTE')
  await expect(page).toHaveURL(new RegExp(`${own}$`))
})
