/**
 * Renders public/icons/icon.svg into the PNG icons used by the PWA manifest.
 * Uses Playwright's Chromium (already a dev dependency). Run: node scripts/generate-icons.ts
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const iconsDir = fileURLToPath(new URL('../public/icons/', import.meta.url))
const svg = await readFile(`${iconsDir}icon.svg`, 'utf8')
const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

type IconSpec = { file: string; size: number; maskable?: boolean }

const ICONS: IconSpec[] = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'maskable-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon-180x180.png', size: 180, maskable: true },
]

const browser = await chromium.launch()
try {
  for (const { file, size, maskable } of ICONS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    // Maskable / apple icons: full-bleed background, mark scaled into the 80 % safe zone.
    const inner = maskable ? Math.round(size * 0.8) : size
    await page.setContent(`
      <html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${maskable ? '#1f4f99' : 'transparent'}">
        <img src="${svgDataUrl}" width="${inner}" height="${inner}" />
      </body></html>`)
    await page.screenshot({ path: `${iconsDir}${file}`, omitBackground: !maskable })
    await page.close()
    console.log(`✓ ${file}`)
  }
} finally {
  await browser.close()
}
