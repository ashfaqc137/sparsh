import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

// DOM-less Node run: components compile for the server and `svelte` resolves to its server build
// through the default export condition, as it would in a SvelteKit server render.
export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'node',
    include: ['test/ssr.test.ts'],
    globals: false,
  },
})
