import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from './vitest.config.js'

const here = dirname(fileURLToPath(import.meta.url))
const react19Modules = join(here, '.react19', 'node_modules')

/**
 * React 19 test matrix (package-level, not a repo-wide CI pipeline — none exists yet). Runs the
 * exact same test files as the default `test` script, but with `react`/`react-dom` resolved to an
 * isolated, correctly-paired React 19 install (see `scripts/setup-react19.mjs` — run automatically
 * by the `test:react19` script before vitest starts), so the common-subset implementation is
 * verified against both React 18 (default) and React 19 (this config).
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      alias: [
        { find: /^react\/jsx-runtime$/, replacement: join(react19Modules, 'react/jsx-runtime.js') },
        {
          find: /^react\/jsx-dev-runtime$/,
          replacement: join(react19Modules, 'react/jsx-dev-runtime.js'),
        },
        { find: /^react-dom\/client$/, replacement: join(react19Modules, 'react-dom/client.js') },
        { find: /^react-dom\/server$/, replacement: join(react19Modules, 'react-dom/server.js') },
        { find: /^react-dom$/, replacement: join(react19Modules, 'react-dom') },
        { find: /^react$/, replacement: join(react19Modules, 'react') },
      ],
    },
  }),
)
