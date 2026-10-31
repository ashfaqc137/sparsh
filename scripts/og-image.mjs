// Regenerates apps/website/public/og-image.png, the 1200×630 link-preview image, from the built
// homepage hero. Run after `pnpm build:website`:
//
//   node scripts/og-image.mjs
//
// Serves the build with `astro preview` on a spare port, screenshots the homepage in dark mode, and
// hides what the 630px frame would cut in half (the intent diagram, later sections, the footer).
// The CSS is injected into the screenshot only; the site itself is unchanged.
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const website = resolve(import.meta.dirname, '../apps/website')
const port = 4395
const out = resolve(website, 'public/og-image.png')

const server = spawn(
  'node_modules/.bin/astro',
  ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: website, stdio: 'ignore' },
)

try {
  const url = `http://127.0.0.1:${port}/sparsh/`
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch(url)).ok) break
    } catch {}
    if (attempt > 60) throw new Error(`astro preview did not start on ${url}`)
    await new Promise((r) => setTimeout(r, 250))
  }

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      colorScheme: 'dark',
    })
    await page.goto(url)
    await page.evaluate(() => document.fonts.ready)
    await page.addStyleTag({
      content:
        '.intent-visual,main>section:not(.hero),body>footer{display:none!important}' +
        '.hero{padding-top:30px!important}',
    })
    await page.waitForTimeout(500)
    await page.screenshot({ path: out })
    console.log(`wrote ${out}`)
  } finally {
    await browser.close()
  }
} finally {
  server.kill()
}
