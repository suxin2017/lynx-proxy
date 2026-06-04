import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const uiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(uiRoot, '..')
const crateDir = path.join(repoRoot, 'crates/lynx-dsl')
const pkgDir = path.join(crateDir, 'pkg')
const outDir = path.join(uiRoot, 'src/wasm/lynx-dsl')

// Manual equivalent (must run inside crates/lynx-dsl):
//   wasm-pack build --target web --features wasm
const result = spawnSync(
  'wasm-pack',
  ['build', '--target', 'web', '--features', 'wasm'],
  { cwd: crateDir, stdio: 'inherit' },
)

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}
if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

const artifacts = ['lynx_dsl_bg.wasm', 'lynx_dsl.js', 'lynx_dsl.d.ts']
fs.mkdirSync(outDir, { recursive: true })

for (const name of artifacts) {
  const src = path.join(pkgDir, name)
  if (!fs.existsSync(src)) {
    console.error(`missing ${src}`)
    process.exit(1)
  }
  fs.copyFileSync(src, path.join(outDir, name))
}
