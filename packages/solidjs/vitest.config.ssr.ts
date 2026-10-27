import { defineConfig } from 'vitest/config'

// DOM-less Node run: `solid-js`/`solid-js/web` resolve to their server builds through the `node`
// export condition, as they would in a SolidStart server render.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/ssr.test.ts'],
    globals: false,
  },
})
