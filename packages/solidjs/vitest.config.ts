import solid from 'vite-plugin-solid'
import { configDefaults, defineConfig } from 'vitest/config'

// vite-plugin-solid compiles the tests' JSX. `solid-js` is inlined (not externalized to Node) and
// resolved with the `browser` condition, or Node would load its server build and `render` would
// throw. `test/ssr.test.ts` runs separately against the server build (see vitest.config.ssr.ts).
export default defineConfig({
  plugins: [solid()],
  resolve: { conditions: ['development', 'browser'] },
  test: {
    server: { deps: { inline: [/solid-js/] } },
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'test/ssr.test.ts'],
    globals: false,
  },
})
