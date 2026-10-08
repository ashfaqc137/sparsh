import { expect, test } from 'playwright/test'

test('reports Sparsh interaction and virtualized observer measurements', async ({ page }) => {
  await page.goto('/performance/')
  await expect(page.locator('html')).toHaveAttribute('data-benchmark-complete', 'true', {
    timeout: 30_000,
  })
  const output = JSON.parse((await page.locator('#benchmark-results').textContent()) ?? '{}') as {
    samples: { warmup: number; iterations: number }
    interactionDispatch: {
      unguarded: { medianMs: number; p95Ms: number }
      guarded: { medianMs: number; p95Ms: number }
      addedMedianMs: number
      addedP95Ms: number
    }
    virtualizedObserverFixture: {
      datasetRows: number
      mountedRows: number
      batches: number
      rowsPerBatch: number
      insertionAndObserverCallbackMs: { medianMs: number; p95Ms: number }
    }
  }

  expect(output.samples.iterations).toBe(5000)
  expect(output.interactionDispatch.guarded.medianMs).toBeGreaterThanOrEqual(0)
  expect(output.virtualizedObserverFixture.datasetRows).toBe(10000)
  console.log(`Sparsh browser benchmark: ${JSON.stringify(output)}`)
})
