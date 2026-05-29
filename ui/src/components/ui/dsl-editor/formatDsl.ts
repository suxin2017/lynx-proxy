import {
  formatDslWasm,
  hasDslParseErrors,
  validateDslDocumentWasm,
} from './dslWasm'

export type { DslFormatValidationResult } from './dslTypes'

export function formatDsl(source: string): string | null {
  return formatDslWasm(source)
}

export function canFormatDsl(content: string) {
  return formatDsl(content) !== null
}

export function isDslFormatted(content: string) {
  const formatted = formatDsl(content)
  if (formatted === null) {
    return false
  }
  return content === formatted
}

export function validateDslDocument(content: string) {
  const result = validateDslDocumentWasm(content)
  return {
    isValid: result.is_valid,
    formattedValue: result.formatted_value,
  }
}

export { hasDslParseErrors }
