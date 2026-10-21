import { expect, test, type Page } from '@playwright/test'
import { loginAs } from './helpers.js'

const bell = (page: Page) =>
  // includeHidden: the centre is a modal sheet, which hides the rest of the page from assistive tech.
  page.getByRole('button', { name: /^Alertas:/, includeHidden: true })

test('the overview shows the hospital status level and the KPIs of every area', async ({
  page,
}) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 2, name: 'Nivel del hospital' })).toBeVisible()
  await expect(
    page.getByRole('list', { name: 'Camas e ingresos' }).getByRole('listitem'),
  ).toHaveCount(4)
  await expect(
    page.getByRole('list', { name: 'Urgencias, traslados y alertas' }).getByRole('listitem'),
  ).toHaveCount(5)
  await expect(page.getByRole('figure', { name: 'Ingresos por hora' })).toBeVisible()
})

test('the engine raises alerts, the bell counts them and they can be acknowledged', async ({
  page,
}) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/')
  // The seeded ED has long boarders: the evaluator (leader tab) raises alerts within seconds.
  await expect(bell(page)).toHaveAttribute('aria-label', /alertas? sin reconocer/, {
    timeout: 20_000,
  })
  const before = Number(await bell(page).locator('[data-count]').getAttribute('data-count'))
  expect(before).toBeGreaterThan(0)

  await bell(page).click()
  const centre = page.getByRole('dialog', { name: 'Centro de alertas' })
  const open = centre.getByRole('list', { name: 'Abiertas' }).getByRole('listitem')
  await expect(open.first()).toBeVisible()
  await centre
    .getByRole('button', { name: /^Reconocer alerta/ })
    .first()
    .click()
  await expect(bell(page)).toHaveAttribute(
    'aria-label',
    before - 1 === 0
      ? /No hay alertas activas/
      : new RegExp(`${before - 1} alertas? sin reconocer`),
    { timeout: 10_000 },
  )

  // Filters narrow the list.
  await centre.getByLabel('Área').selectOption('emergency')
  const count = await open.count()
  await centre.getByLabel('Área').selectOption('')
  expect(await open.count()).toBeGreaterThanOrEqual(count)
})

test('wall mode rotates through the dashboards and exits with Escape', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/ajustes')
  await page.getByLabel('Segundos en cada pantalla').fill('5')
  await page.getByRole('button', { name: 'Guardar umbrales' }).click()
  await expect(page.getByText('Umbrales guardados')).toBeVisible()

  await page.goto('/pantalla')
  const main = page.getByRole('main')
  await expect(main).toHaveAttribute('aria-label', /^Torre de control \(1 de 5\)/)
  await expect(main).toHaveAttribute('aria-label', /^Camas \(2 de 5\)/, { timeout: 12_000 })
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/$/)
})

test('thresholds are validated and survive a reload', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/ajustes')
  const field = page.getByLabel('Segundos en cada pantalla')
  await field.fill('2')
  await page.getByRole('button', { name: 'Guardar umbrales' }).click()
  await expect(page.getByText('Debe estar entre 5 y 120.')).toBeVisible()
  await field.fill('30')
  await page.getByRole('button', { name: 'Guardar umbrales' }).click()
  await page.reload()
  await expect(page.getByLabel('Segundos en cada pantalla')).toHaveValue('30')
  await page.getByRole('button', { name: 'Restablecer valores por defecto' }).click()
  await expect(page.getByLabel('Segundos en cada pantalla')).toHaveValue('20')
})
