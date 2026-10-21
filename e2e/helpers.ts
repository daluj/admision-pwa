import { expect, type Page } from '@playwright/test'

/** Simulated login from the login page. Nurse supervisors also pick a unit. */
export async function loginAs(page: Page, roleLabel: string, unit?: string): Promise<void> {
  await page.goto('/login')
  const card = page.locator('[data-slot="card"]', {
    has: page.getByRole('heading', { level: 2, name: roleLabel, exact: true }),
  })
  await expect(card).toBeVisible()
  if (unit) await card.getByLabel('Unidad').selectOption({ label: unit })
  await card.getByRole('button', { name: `Entrar como ${roleLabel}` }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}
