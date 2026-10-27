import angular from '@analogjs/vite-plugin-angular'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The Angular compiler plugin is required (not plain esbuild): signal `input()`/`output()` and
  // the directives' decorator metadata only work once compiled by Angular's own compiler. `jit:
  // false` compiles tests AOT, like a real app — the plugin's JIT mode doesn't register signal
  // inputs (they'd silently compile to a directive with no inputs).
  plugins: [angular({ tsconfig: 'tsconfig.spec.json', jit: false })],
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    globals: false,
  },
})
