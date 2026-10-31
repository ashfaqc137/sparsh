import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

// ESM entry per package. `angular` is built by ng-packagr (Angular Package Format), not tsup.
// `svelte` is built by svelte-package and ships uncompiled `.svelte`/`.js` sources whose
// `index.js` only re-exports, so its row is every published source file concatenated (the
// consumer's Svelte compiler produces the final code).
const packages = {
  core: 'dist/index.js',
  dom: 'dist/index.js',
  react: 'dist/index.js',
  vue: 'dist/index.js',
  solidjs: 'dist/index.js',
  angular: 'dist/fesm2022/sparshlabs-angular.mjs',
  svelte: { dir: 'dist', extensions: ['.js', '.svelte'] },
}
const root = process.cwd()

async function readEntry(name, entry) {
  if (typeof entry === 'string') return readFile(resolve(root, `packages/${name}/${entry}`))
  const dir = resolve(root, `packages/${name}/${entry.dir}`)
  const files = (await readdir(dir, { recursive: true }))
    .filter((file) => entry.extensions.some((extension) => file.endsWith(extension)))
    .sort()
  if (files.length === 0) throw new Error(`no source files in ${dir}`)
  return Buffer.concat(await Promise.all(files.map((file) => readFile(resolve(dir, file)))))
}

console.log('\nCompressed package entry sizes (ESM, gzip level 9)')
for (const [name, entry] of Object.entries(packages)) {
  try {
    const contents = await readEntry(name, entry)
    const gzipped = gzipSync(contents, { level: 9 })
    console.log(
      `@sparshlabs/${name}: ${contents.length.toLocaleString()} bytes raw, ${gzipped.length.toLocaleString()} bytes gzip`,
    )
  } catch {
    const where = typeof entry === 'string' ? entry : `${entry.dir}/`
    console.log(`@sparshlabs/${name}: build output not found (packages/${name}/${where})`)
    process.exitCode = 1
  }
}
