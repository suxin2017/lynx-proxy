export interface DslDiagnostic {
  from: number
  to: number
  severity: string
  message: string
}

export interface DslHighlightSpan {
  from: number
  to: number
  kind: string
}

export interface DslValidationResult {
  is_valid: boolean
  diagnostics: DslDiagnostic[]
  highlights: DslHighlightSpan[]
}

export interface DslFormatValidationResult {
  is_valid: boolean
  formatted_value: string | null
}
