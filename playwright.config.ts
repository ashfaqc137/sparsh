import { defineConfig, devices } from 'playwright/test'

const devServer = process.env.SPARSH_E2E_DEV === '1'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4322',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: devServer
      ? 'node_modules/.bin/astro dev --host 127.0.0.1 --port 4322 --force'
      : 'node_modules/.bin/astro build && node_modules/.bin/astro preview --host 127.0.0.1 --port 4322 --strictPort',
    cwd: 'apps/website',
    url: 'http://127.0.0.1:4322/playground/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
