import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const packages = ['core', 'dom', 'react', 'vue']
const root = process.cwd()

console.log('\nCompressed package entry sizes (ESM, gzip level 9)')
for (const name of packages) {
  const path = resolve(root, `packages/${name}/dist/index.js`)
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
