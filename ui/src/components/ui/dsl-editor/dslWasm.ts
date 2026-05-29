import type {
  DslDiagnostic,
  DslFormatValidationResult,
  DslValidationResult,
} from './dslTypes'

type WasmModule = typeof import('@/wasm/lynx-dsl/lynx_dsl.js')

let wasm: WasmModule | null = null
let loading: Promise<WasmModule> | null = null

export function isDslWasmLoaded() {
  return wasm !== null
}

export async function ensureDslWasm(): Promise<WasmModule> {
  if (wasm) {
    return wasm
  }

  if (!loading) {
    loading = (async () => {
      const mod = await import('@/wasm/lynx-dsl/lynx_dsl.js')
      if (typeof window === 'undefined') {
        const { readFileSync } = await import('node:fs')
        const { dirname, join } = await import('node:path')
        const { fileURLToPath } = await import('node:url')
        const wasmPath = join(
          dirname(fileURLToPath(import.meta.url)),
          '../../../wasm/lynx-dsl/lynx_dsl_bg.wasm',
        )
        await mod.default(readFileSync(wasmPath))
      }
      else {
        await mod.default()
      }
      wasm = mod
      return mod
    })()
  }

  return loading
}

function requireWasm(): WasmModule {
  if (!wasm) {
    throw new Error('DSL WASM is not loaded. Call ensureDslWasm() before using the editor.')
  }
  return wasm
}

export function validateDsl(source: string): DslValidationResult {
  return requireWasm().validate_dsl(source) as DslValidationResult
}

export function formatDslWasm(source: string): string | null {
  const formatted = requireWasm().format_dsl_wasm(source)
  return formatted ?? null
}

export function validateDslDocumentWasm(source: string): DslFormatValidationResult {
  const result = requireWasm().validate_dsl_document_wasm(source) as {
    is_valid: boolean
    formatted_value?: string | null
  }
  return {
    is_valid: result.is_valid,
    formatted_value: result.formatted_value ?? null,
  }
}

export function collectDslSyntaxDiagnosticsWasm(source: string): DslDiagnostic[] {
  return requireWasm().collect_dsl_syntax_diagnostics(source) as DslDiagnostic[]
}

export function hasDslParseErrors(source: string): boolean {
  return requireWasm().has_dsl_parse_errors(source)
}

export function parseDslProgram(source: string) {
  return requireWasm().parse_dsl_program_wasm(source)
}
