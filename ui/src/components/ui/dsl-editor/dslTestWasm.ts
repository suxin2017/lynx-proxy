import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ensureDslWasm } from './dslWasm'

const wasmJs = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../wasm/lynx-dsl/lynx_dsl.js',
)

export const dslWasmAvailable = existsSync(wasmJs)

export async function setupDslWasmForTests() {
  if (!dslWasmAvailable) {
    throw new Error('DSL WASM artifacts missing. Run: npm run dsl:build')
  }
  await ensureDslWasm()
}
