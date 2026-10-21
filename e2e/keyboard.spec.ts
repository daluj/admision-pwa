import { expect, test } from '@playwright/test'
import { loginAs } from './helpers.js'

test('the skip link is the first tab stop and jumps to the main content', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/camas')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: /Saltar al contenido/i })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
})

test('the alert centre opens and closes from the keyboard and gives the focus back to the bell', async ({
  page,
}) => {
  await loginAs(page, 'Jefe/a de Admisión')
  const bell = page.getByRole('button', { name: /^Alertas:/ })
  await bell.focus()
  await page.keyboard.press('Enter')
  const centre = page.getByRole('dialog', { name: 'Centro de alertas' })
  await expect(centre).toBeVisible()
  // Focus is inside the dialog (trapped), not behind it.
  await expect(centre.locator(':focus')).toHaveCount(1)
  // Escape may arrive while the sheet is still animating in: keep pressing until it closes.
  await expect(async () => {
    await page.keyboard.press('Escape')
    await expect(centre).toBeHidden({ timeout: 1000 })
  }).toPass({ timeout: 10_000 })
  await expect(bell).toBeFocused()
})

test('a bed sheet opens from the keyboard, traps the focus and returns it to the opener', async ({
  page,
}) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/camas')
  const assign = page.getByRole('button', { name: /^Asignar cama/ }).first()
  await assign.focus()
  await page.keyboard.press('Enter')
  const sheet = page.getByRole('dialog', { name: 'Asignar cama' })
  await expect(sheet).toBeVisible()
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    // However many times we tab, the focus never leaves the sheet.
    expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(assign).toBeFocused()
})

test('the sidebar links are reachable and activate with Enter', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  const link = page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Urgencias' })
  await link.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/urgencias$/)
})

test('wall mode is fully keyboard driven', async ({ page }) => {
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/pantalla')
  const main = page.getByRole('main')
  await expect(main).toHaveAttribute('aria-label', /\(1 de 5\)/)
  await page.keyboard.press('ArrowRight')
  await expect(main).toHaveAttribute('aria-label', /\(2 de 5\)/)
  await page.keyboard.press(' ')
  await expect(page.getByRole('button', { name: 'Reanudar la rotación' })).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await expect(main).toHaveAttribute('aria-label', /\(1 de 5\)/)
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/$/)
})

test('reduced motion: no animations run while the page is idle', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loginAs(page, 'Jefe/a de Admisión')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const running = await page.evaluate(() =>
    document
      .getAnimations()
      .filter(
        (a) =>
          a.playState === 'running' &&
          !(a.effect as KeyframeEffect | null)?.target?.closest('[role="status"]'),
      )
      .map((a) => a.constructor.name + ':' + ((a as CSSAnimation).animationName ?? '')),
  )
  expect(running).toEqual([])
})
