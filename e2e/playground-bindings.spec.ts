import { type Page, expect, test } from 'playwright/test'

type Scenario = 'inbox' | 'late' | 'meaning'
type Mode = 'Report' | 'Enforce'

/**
 * Every scenario runs against the public playground (one binding, no framework picker) and against
 * each framework binding in the internal harness (`apps/bindings-harness`, never deployed). Both
 * render the same scene with the same test ids and accessible names, so one spec covers them all.
 */
interface Target {
  name: string
  url: string
  /** Harness only: the framework button to select; also the scene's `data-framework`. */
  framework?: string
}

const harnessUrl = 'http://127.0.0.1:4323/'
const targets: Target[] = [
  { name: 'Playground', url: '/sparsh/playground/' },
  ...['React', 'Vue', 'Solid', 'Svelte', 'Angular'].map((framework) => ({
    name: framework,
    url: harnessUrl,
    framework,
  })),
]

const scenarioNames: Record<Scenario, string> = {
  inbox: 'The inbox reshuffle',
  late: 'The late render',
  meaning: 'The button that changes meaning',
}

async function openPlayground(page: Page, target: Target, scenario: Scenario, mode: Mode) {
  await page.goto(target.url)
  await expect(page.getByTestId('playground-root')).toHaveAttribute('data-hydrated', 'true')

  const scene = page.getByTestId('playground-scene')
  if (target.framework !== undefined) {
    await page.getByRole('button', { name: target.framework, exact: true }).click()
    await expect(scene).toHaveAttribute('data-framework', target.framework.toLowerCase())
  }

  const scenarioButton = page.getByRole('button', { name: scenarioNames[scenario] })
  await scenarioButton.click()
  await expect(scenarioButton).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: mode, exact: true }).click()

  const cooldown = page.getByRole('slider', { name: 'Cooldown in milliseconds' })
  await cooldown.focus()
  await cooldown.press('End')
  await expect(page.getByText('1500 ms', { exact: true })).toBeVisible()

  await expect(scene).toBeVisible()
  return scene
}

async function triggerScenario(page: Page, scenario: Scenario) {
  await page.getByRole('button', { name: /Start scenario/ }).click()
  await expect(page.getByRole('button', { name: /Reset scenario/ })).toBeVisible()

  if (scenario === 'inbox') {
    // Leo arrives above Maya. A tap on the newly arrived row is a fresh target activation.
    const leo = page.getByTestId('leo-message')
    await expect(leo).toBeVisible({ timeout: 3_000 })
    await leo.click()
    return
  }

  if (scenario === 'late') {
    const action = page.getByTestId('late-action')
    await expect(action).toBeVisible({ timeout: 3_000 })
    await action.click()
    return
  }

  const action = page.getByTestId('meaning-action')
  const box = await action.boundingBox()
  if (box === null)
    throw new Error('The changing button should be visible before the press starts.')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await expect(action).toHaveAttribute('aria-disabled', 'false', { timeout: 3_000 })
  await page.mouse.up()
}

for (const target of targets) {
  for (const scenario of ['inbox', 'late', 'meaning'] as const) {
    for (const mode of ['Report', 'Enforce'] as const) {
      test(`${target.name}: ${scenario} is observed and ${mode.toLowerCase()} mode behaves correctly`, async ({
        page,
      }) => {
        const scene = await openPlayground(page, target, scenario, mode)
        await triggerScenario(page, scenario)

        const decision = scene.getByTestId('decision-result')
        await expect(decision).toBeVisible()
        await expect(decision).toContainText(/age|semantics|continuity/)

        if (mode === 'Report') {
          await expect(decision).toContainText('Report mode lets it through')
          await expect(scene.getByTestId('scenario-result')).toBeVisible()
          await expect(scene.getByTestId('scenario-result')).toContainText(/opened/)
        } else {
          await expect(decision).toContainText('caught')
          await expect(scene.getByTestId('scenario-result')).toHaveCount(0)
        }
      })
    }
  }

  for (const mode of ['Report', 'Enforce'] as const) {
    test(`${target.name}: a stable pre-existing message still opens in ${mode.toLowerCase()} mode`, async ({
      page,
    }) => {
      const scene = await openPlayground(page, target, 'inbox', mode)
      await page.getByTestId('maya-message').click()
      await expect(scene.getByTestId('scenario-result')).toContainText('Maya’s message opened')
      await expect(scene.getByTestId('decision-result')).toContainText('Tap allowed')
    })
  }

  for (const scenario of ['inbox', 'late', 'meaning'] as const) {
    test(`${target.name}: ${scenario} can be started and replayed`, async ({ page }) => {
      const scene = await openPlayground(page, target, scenario, 'Report')
      await triggerScenario(page, scenario)
      await expect(scene.getByTestId('scenario-result')).toBeVisible()

      await triggerScenario(page, scenario)
      await expect(scene.getByTestId('scenario-result')).toBeVisible()
      await expect(scene.getByTestId('decision-result')).toContainText(
        'Report mode lets it through',
      )
    })
  }

  test(`${target.name}: inbox reset cancels an armed reshuffle and clears an arrived message`, async ({
    page,
  }) => {
    const scene = await openPlayground(page, target, 'inbox', 'Report')
    const start = page.getByRole('button', { name: /Start scenario/ })
    const reset = page.getByRole('button', { name: /Reset scenario/ })
    const leo = page.getByTestId('leo-message')

    await start.click()
    await expect(reset).toBeVisible()
    await reset.click()
    await expect(start).toBeVisible()
    await expect(leo).toHaveCount(0)
    await expect(scene.getByTestId('decision-result')).toHaveCount(0)

    // The cancelled timer must not deliver Leo after reset.
    await page.waitForTimeout(1_500)
    await expect(leo).toHaveCount(0)

    // Reset also restores the initial inbox after the reshuffle has completed.
    await start.click()
    await expect(leo).toBeVisible({ timeout: 3_000 })
    await page.getByRole('button', { name: /Reset scenario/ }).click()
    await expect(start).toBeVisible()
    await expect(leo).toHaveCount(0)
    await expect(scene.getByTestId('scenario-result')).toHaveCount(0)

    // The restored scenario can be started again.
    await start.click()
    await expect(leo).toBeVisible({ timeout: 3_000 })
  })
}
