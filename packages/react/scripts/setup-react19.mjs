#!/usr/bin/env node
/**
 * Fetches an isolated, correctly-paired React 19 install for the `test:react19` matrix run, into
 * `packages/react/.react19/` (gitignored, not part of the pnpm workspace graph).
 *
 * Why a plain, separate `npm install` instead of pnpm workspace aliases: pnpm's peer-dependency
 * resolution hoists a single "react" for every "react"-named peer edge in the workspace graph —
 * aliasing both `react@18` (real devDependency, for the default `test` run) and `react@19` (for
 * this matrix) side-by-side in the same `package.json` caused pnpm to pair `react-dom@19` with
 * the real `react@18`, which crashes at runtime (mismatched React internals). A standalone `npm
 * install` in its own directory has no such conflict — it resolves its own self-contained,
 * correctly-paired `react@19` + `react-dom@19`, which `vitest.config.react19.ts` then aliases to.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REACT_RANGE = '^19.2.0'
const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const installDir = join(packageDir, '.react19')
const markerFile = join(installDir, '.installed-range')

function alreadyInstalled() {
  if (!existsSync(markerFile)) return false
  try {
    return readFileSync(markerFile, 'utf8').trim() === REACT_RANGE
  } catch {
    return false
  }
}

if (alreadyInstalled()) {
  console.log(`[react19] already installed (${REACT_RANGE}) — skipping`)
  process.exit(0)
}

console.log(
  `[react19] installing react@${REACT_RANGE} + react-dom@${REACT_RANGE} into ${installDir}`,
)

const result = spawnSync(
  'npm',
  [
    'install',
    '--no-save',
    '--no-package-lock',
    '--no-audit',
    '--no-fund',
    '--prefix',
    installDir,
    `react@${REACT_RANGE}`,
    `react-dom@${REACT_RANGE}`,
  ],
  { stdio: 'inherit' },
)

if (result.status !== 0) {
  console.error('[react19] npm install failed')
  process.exit(result.status ?? 1)
}

writeFileSync(markerFile, REACT_RANGE)
