import react from '@astrojs/react'
import { defineConfig } from 'astro/config'

// Served at sparshlabs.com/sparsh/ by its own Worker (wrangler.jsonc route). Workers static
// assets don't strip the path prefix, so pages are built into dist/sparsh/ and wrangler serves
// dist/; links go through src/lib/paths.ts so they carry the base.
export default defineConfig({
  site: 'https://sparshlabs.com',
  base: '/sparsh',
  outDir: './dist/sparsh',
  trailingSlash: 'always',
  integrations: [react()],
  vite: {
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
  },
})
