import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

// ESM entry per package. `angular` is built by ng-packagr (Angular Package Format), not tsup.
const packages = {
  core: 'dist/index.js',
  dom: 'dist/index.js',
  react: 'dist/index.js',
  vue: 'dist/index.js',
  solidjs: 'dist/index.js',
  angular: 'dist/fesm2022/sparshlabs-angular.mjs',
}
const root = process.cwd()

console.log('\nCompressed package entry sizes (ESM, gzip level 9)')
for (const [name, entry] of Object.entries(packages)) {
  const path = resolve(root, `packages/${name}/${entry}`)
  try {
    const [contents, info] = await Promise.all([readFile(path), stat(path)])
    const gzipped = gzipSync(contents, { level: 9 })
    console.log(
      `@sparshlabs/${name}: ${info.size.toLocaleString()} bytes raw, ${gzipped.length.toLocaleString()} bytes gzip`,
    )
  } catch {
    console.log(`@sparshlabs/${name}: build output not found (${path})`)
    process.exitCode = 1
  }
}
