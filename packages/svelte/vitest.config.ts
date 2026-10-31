import { svelte } from '@sveltejs/vite-plugin-svelte'
import { configDefaults, defineConfig } from 'vitest/config'

// vite-plugin-svelte compiles the components and `.svelte.ts` test modules. `svelte` is inlined
// (not externalized to Node) and resolved with the `browser` condition, or Node would load its
// server build and `mount` would throw. `test/ssr.test.ts` runs separately against the server
// build (see vitest.config.ssr.ts).
export default defineConfig({
  plugins: [svelte()],
  resolve: { conditions: ['development', 'browser'] },
  test: {
    server: { deps: { inline: [/svelte/] } },
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'test/ssr.test.ts'],
    globals: false,
  },
})
