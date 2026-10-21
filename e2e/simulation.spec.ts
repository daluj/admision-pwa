import { expect, test, type Page } from '@playwright/test'
import { loginAs } from './helpers.js'

const clock = (page: Page) => page.locator('header time')
const controls = (page: Page) => page.getByRole('group', { name: 'Control de la simulación' })
const logRows = (page: Page) =>
  page.getByRole('table', { name: 'Registro de eventos' }).locator('tbody tr')

const minutes = async (page: Page) => {
  const text = (await clock(page).textContent()) ?? ''
  const [h, m] = text.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

test('only the head of admissions sees the simulation controls', async ({ page }) => {
  await loginAs(page, 'Dirección')
  await expect(clock(page)).toHaveText('08:00')
  await expect(controls(page)).toHaveCount(0)
})

test('play advances the simulated clock and fills the event log; pause stops it', async ({
  page,
}) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await expect(clock(page)).toHaveText('08:00')
  await expect(controls(page)).toBeVisible()

  await controls(page).getByRole('button', { name: 'Iniciar simulación' }).click()
  await expect(controls(page).getByRole('button', { name: 'Pausar simulación' })).toBeVisible()
  // 60× ⇒ one simulated minute per real second.
  await expect.poll(() => minutes(page), { timeout: 15_000 }).toBeGreaterThan(8 * 60 + 2)

  await page.goto('/ajustes')
  const table = page.getByRole('table', { name: 'Registro de eventos' })
  await expect(table.getByText('Simulación iniciada')).toBeVisible()
  await expect.poll(() => logRows(page).count(), { timeout: 20_000 }).toBeGreaterThan(2)

  await controls(page).getByRole('button', { name: 'Pausar simulación' }).click()
  await expect(controls(page).getByRole('button', { name: 'Iniciar simulación' })).toBeVisible()
  await expect(table.getByText('Simulación en pausa')).toBeVisible()
  const frozen = await clock(page).textContent()
  await page.waitForTimeout(2500)
  await expect(clock(page)).toHaveText(frozen ?? '')
})

test('the simulated time survives a reload and a second tab follows it', async ({
  page,
  context,
}) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await controls(page).getByRole('button', { name: 'Iniciar simulación' }).click()
  await expect.poll(() => minutes(page), { timeout: 15_000 }).toBeGreaterThan(8 * 60 + 1)
  await controls(page).getByRole('button', { name: 'Pausar simulación' }).click()
  await expect(controls(page).getByRole('button', { name: 'Iniciar simulación' })).toBeVisible()
  // A tick that was already running when Pause was pressed may still land: let it settle first.
  await page.waitForTimeout(1500)
  const paused = await clock(page).textContent()

  await page.reload()
  await expect(clock(page)).toHaveText(paused ?? '')

  const other = await context.newPage()
  await other.goto('/')
  await expect(clock(other)).toHaveText(paused ?? '')

  // Resume in the first tab: the second one follows live.
  await controls(page).getByRole('button', { name: 'Iniciar simulación' }).click()
  await expect
    .poll(() => minutes(other), { timeout: 15_000 })
    .toBeGreaterThan((await minutes(page)) - 1)
  await controls(page).getByRole('button', { name: 'Pausar simulación' }).click()
})

test('the speed menu changes the speed', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await controls(page)
    .getByRole('button', { name: /Velocidad de la simulación: 60×/ })
    .click()
  await page.getByRole('menuitemradio', { name: '300×' }).click()
  await expect(
    controls(page).getByRole('button', { name: /Velocidad de la simulación: 300×/ }),
  ).toBeVisible()
  await page.goto('/ajustes')
  await expect(
    page.getByRole('table', { name: 'Registro de eventos' }).getByText('Velocidad cambiada'),
  ).toBeVisible()
})

test('"Restablecer demo" stops the simulation and returns the clock to 08:00', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await controls(page).getByRole('button', { name: 'Iniciar simulación' }).click()
  await expect.poll(() => minutes(page), { timeout: 15_000 }).toBeGreaterThan(8 * 60 + 1)

  await page.goto('/ajustes')
  await page.getByRole('button', { name: 'Restablecer demo' }).click()
  const dialog = page.getByRole('alertdialog', { name: '¿Restablecer la demo?' })
  await dialog.getByRole('button', { name: 'Restablecer', exact: true }).click()

  await expect(page.getByText('Demo restablecida con la semilla 42')).toBeVisible()
  await expect(clock(page)).toHaveText('08:00')
  await expect(controls(page).getByRole('button', { name: 'Iniciar simulación' })).toBeVisible()
  await page.goto('/ajustes')
  await expect(
    page.getByRole('table', { name: 'Registro de eventos' }).locator('tbody tr'),
  ).toHaveCount(1)
})
