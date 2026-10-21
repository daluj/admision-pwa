import { expect, test } from '@playwright/test'
import { loginAs } from './helpers.js'

/** Follows `docs/demo-script.md` step by step (the numbers match the script's sections). */
test('the guided demo script works end to end', async ({ page }) => {
  test.setTimeout(180_000)

  await test.step('0. choose the pressure scenario, reset, log in again and jump to 14:00', async () => {
    await loginAs(page, 'Jefe/a de Admisión')
    await page.goto('/ajustes')
    await page.getByLabel('Escenario').selectOption('high-pressure')
    await page.getByRole('button', { name: 'Restablecer demo' }).click()
    const dialog = page.getByRole('alertdialog', { name: '¿Restablecer la demo?' })
    await expect(dialog).toContainText('Lunes de alta presión')
    await dialog.getByRole('button', { name: 'Restablecer', exact: true }).click()
    await expect(page.getByText(/^Demo restablecida con la semilla/)).toBeVisible()
    // With another seed the simulated users change and the demo goes back to the login.
    if (page.url().endsWith('/login')) await loginAs(page, 'Jefe/a de Admisión')
    await page.goto('/ajustes')
    await expect(page.getByText('Escenario actual').locator('..')).toContainText(
      'Lunes de alta presión',
    )
    await page.getByRole('group', { name: 'Atajos' }).getByRole('button', { name: '14:00' }).click()
    await expect(page.getByText('14:00', { exact: true }).first()).toBeVisible({ timeout: 150_000 })
    await expect(page.locator('header time')).toHaveText('14:00', { timeout: 150_000 })
  })

  await test.step('1. the control tower shows the status level and the KPIs', async () => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 2, name: 'Nivel del hospital' })).toBeVisible()
    await expect(
      page.getByRole('list', { name: 'Camas e ingresos' }).getByRole('listitem'),
    ).toHaveCount(4)
    await expect(page.getByRole('figure', { name: 'Ingresos por hora' })).toBeVisible()
  })

  await test.step('2. the alert centre lists alerts and one can be acknowledged', async () => {
    const bell = page.getByRole('button', { name: /^Alertas:/, includeHidden: true })
    await expect(bell).toHaveAttribute('aria-label', /alertas? sin reconocer/, { timeout: 30_000 })
    const before = Number((await bell.innerText()).trim())
    await bell.click()
    const centre = page.getByRole('dialog', { name: 'Centro de alertas' })
    await expect(
      centre.getByRole('list', { name: 'Abiertas' }).getByRole('listitem').first(),
    ).toBeVisible()
    await centre
      .getByRole('button', { name: /^Reconocer alerta/ })
      .first()
      .click()
    await expect(bell).not.toHaveText(String(before), { timeout: 10_000 })
    await page.keyboard.press('Escape')
  })

  await test.step('3. Urgencias board and the journey of a patient', async () => {
    await page.goto('/urgencias')
    await expect(page.getByRole('heading', { level: 1, name: 'Urgencias' })).toBeVisible()
    await page
      .getByRole('link', { name: /^Ver recorrido del paciente/ })
      .first()
      .click()
    await expect(page.getByRole('list', { name: 'Línea de tiempo' })).toBeVisible()
    await expect(page.getByText('Ubicación actual:')).toBeVisible()
  })

  await test.step('4. Camas: the census and (if any request is open) a bed assignment', async () => {
    await page.goto('/camas')
    await expect(
      page.getByRole('list', { name: 'Indicadores de camas' }).getByRole('listitem'),
    ).toHaveCount(7)
    const assign = page.getByRole('button', { name: /^Asignar cama/ }).first()
    if (await assign.isVisible().catch(() => false)) {
      await assign.click()
      const sheet = page.getByRole('dialog', { name: 'Asignar cama' })
      await sheet.getByRole('radio').first().check()
      await sheet.getByRole('button', { name: 'Reservar cama' }).click()
      await expect(page.getByText(/^Cama .+ reservada/)).toBeVisible()
    }
  })

  await test.step('5. Traslados: the dispatch queue and porters', async () => {
    await page.goto('/traslados')
    await expect(page.getByRole('list', { name: 'Indicadores de traslados' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Celadores' })).toBeVisible()
  })

  await test.step('6. wall mode rotates and exits with Escape', async () => {
    await page.goto('/pantalla')
    await expect(page.getByRole('main')).toHaveAttribute(
      'aria-label',
      /^Torre de control \(1 de 5\)/,
    )
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('main')).toHaveAttribute('aria-label', /^Camas \(2 de 5\)/)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/$/)
  })

  await test.step('7. jump to 20:00 and see the day evolve', async () => {
    await page.goto('/ajustes')
    await page.getByRole('group', { name: 'Atajos' }).getByRole('button', { name: '20:00' }).click()
    await expect(page.locator('header time')).toHaveText('20:00', { timeout: 150_000 })
  })
})
