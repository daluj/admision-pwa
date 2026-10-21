import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { loginAs } from './helpers.js'

/**
 * Automated accessibility audit (axe, WCAG 2.0/2.1 A + AA): every page each role can open, in
 * light and dark theme. Zero violations is the bar; nothing is disabled.
 */
const ALL = [
  { path: '/', name: 'Torre de control' },
  { path: '/camas', name: 'Camas' },
  { path: '/urgencias', name: 'Urgencias' },
  { path: '/ingresos-altas', name: 'Ingresos y altas' },
  { path: '/traslados', name: 'Traslados' },
  { path: '/seguimiento', name: 'Seguimiento' },
  { path: '/ajustes', name: 'Ajustes' },
  { path: '/pantalla', name: 'Modo pantalla' },
] as const
const byPath = (...paths: string[]) => ALL.filter((p) => paths.includes(p.path))

const ROLES: { label: string; pages: readonly { path: string; name: string }[]; unit?: boolean }[] =
  [
    { label: 'Jefe/a de Admisión', pages: ALL },
    {
      label: 'Dirección',
      pages: byPath(
        '/',
        '/camas',
        '/urgencias',
        '/ingresos-altas',
        '/traslados',
        '/seguimiento',
        '/pantalla',
      ),
    },
    {
      label: 'Gestor/a de camas',
      pages: byPath('/', '/camas', '/ingresos-altas', '/traslados', '/seguimiento', '/pantalla'),
    },
    {
      label: 'Coordinación de Urgencias',
      pages: byPath('/', '/camas', '/urgencias', '/seguimiento', '/pantalla'),
    },
    {
      label: 'Supervisor/a de enfermería',
      pages: byPath('/camas', '/ingresos-altas', '/seguimiento'),
      unit: true,
    },
    { label: 'Celador/a', pages: byPath('/traslados') },
  ]

type Finding = { page: string; rule: string; impact: string | null | undefined; nodes: string[] }

async function scan(page: Page, name: string): Promise<Finding[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return results.violations.map((v) => ({
    page: name,
    rule: `${v.id}: ${v.help}`,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  }))
}

for (const role of ROLES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${role.label} — ${theme} theme has no accessibility violations`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.addInitScript((t) => localStorage.setItem('torre-control:theme', t), theme)
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
      if (role.unit) {
        await page.goto('/login')
        const card = page.locator('[data-slot="card"]', {
          has: page.getByRole('heading', { level: 2, name: role.label }),
        })
        const unit = await card.getByLabel('Unidad').locator('option').nth(2).innerText()
        await loginAs(page, role.label, unit)
      } else {
        await loginAs(page, role.label)
      }
      const findings: Finding[] = []
      for (const target of role.pages) {
        await page.goto(target.path)
        // The first heading means the page rendered; live data needs a moment to fill the page.
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
        await page.waitForTimeout(800)
        findings.push(...(await scan(page, target.name)))
      }
      expect(findings, `axe violations (${theme})`).toEqual([])
    })
  }
}

test.describe('overlays and the login page', () => {
  const axe = async (page: Page) =>
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)

  for (const theme of ['light', 'dark'] as const) {
    test(`login page (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('torre-control:theme', t), theme)
      await page.emulateMedia({ colorScheme: theme })
      await page.goto('/login')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await axe(page)).toEqual([])
    })

    test(`alert centre and assign-bed sheet (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('torre-control:theme', t), theme)
      await page.emulateMedia({ colorScheme: theme })
      await loginAs(page, 'Jefe/a de Admisión')
      await page.goto('/camas')
      const assign = page.getByRole('button', { name: /^Asignar cama/ }).first()
      await expect(assign).toBeVisible()
      await assign.click()
      const sheet = page.getByRole('dialog', { name: 'Asignar cama' })
      await expect(sheet.getByRole('radio').first()).toBeVisible()
      expect(await axe(page), 'assign sheet').toEqual([])
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: /^Alertas:/ }).click()
      await expect(page.getByRole('dialog', { name: 'Centro de alertas' })).toBeVisible()
      expect(await axe(page), 'alert centre').toEqual([])
    })
  }
})
