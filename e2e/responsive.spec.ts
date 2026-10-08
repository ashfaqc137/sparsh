import { expect, test } from 'playwright/test'

const viewports = [
  { label: 'small phone', width: 320, height: 780 },
  { label: 'phone', width: 375, height: 812 },
  { label: 'tablet', width: 768, height: 1024 },
]

const pages = [
  { path: '/', landmark: 'main.philosophy-page' },
  { path: '/demo/', landmark: '.demo-stage' },
  { path: '/playground/', landmark: '[data-testid="playground-root"]' },
  { path: '/how-it-works/', landmark: 'main.explainer-page' },
  { path: '/docs/', landmark: 'main.docs-page' },
  { path: '/docs/concepts/', landmark: 'main.docs-page' },
  { path: '/docs/react/', landmark: 'main.docs-page' },
  { path: '/docs/vue/', landmark: 'main.docs-page' },
  { path: '/docs/dom/', landmark: 'main.docs-page' },
]

for (const viewport of viewports) {
  test(`website pages fit the ${viewport.label} viewport (${viewport.width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    for (const route of pages) {
      await page.goto(route.path)
      await expect(page.locator(route.landmark)).toBeVisible()
      if (route.path === '/playground/') {
        await expect(page.getByTestId('playground-root')).toHaveAttribute('data-hydrated', 'true')
      }
      if (route.path === '/docs/') {
        const table = page.locator('.docs-table-wrap')
        const sizes = await table.evaluate((element) => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }))
        expect(sizes.scrollWidth).toBeGreaterThan(sizes.clientWidth)
      }

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
      }))
      expect(
        dimensions.documentWidth,
        `${route.path} has horizontal overflow at ${viewport.width}px`,
      ).toBeLessThanOrEqual(dimensions.viewport)
      expect(
        dimensions.bodyWidth,
        `${route.path} body has horizontal overflow at ${viewport.width}px`,
      ).toBeLessThanOrEqual(dimensions.viewport)

      const target = route.path === '/playground/' ? '.pg-workbench' : '.demo-stage'
      if (route.path === '/demo/' || route.path === '/playground/') {
        const bounds = await page.locator(target).boundingBox()
        if (!bounds) throw new Error(`${route.path} interactive area should have a layout box`)
        expect(bounds.x).toBeGreaterThanOrEqual(0)
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(dimensions.viewport)
      }
    }
  })
}
