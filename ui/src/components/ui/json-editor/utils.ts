export interface JsonEditorValidationResult {
  isValid: boolean
  formattedValue: string | null
  errorMessage: string | null
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Invalid JSON'
}

export function validateJsonDocument(content: string): JsonEditorValidationResult {
  if (!content.trim()) {
    return {
      isValid: false,
      formattedValue: null,
      errorMessage: 'JSON content is empty',
    }
  }

  try {
    const parsed = JSON.parse(content)

    return {
      isValid: true,
      formattedValue: JSON.stringify(parsed, null, 2),
      errorMessage: null,
    }
  }
  catch (error) {
    return {
      isValid: false,
      formattedValue: null,
      errorMessage: toErrorMessage(error),
    }
  }
}

export function canFormatJsonDocument(content: string) {
  return validateJsonDocument(content).formattedValue !== null
}

export function isJsonDocumentFormatted(content: string) {
  const validation = validateJsonDocument(content)

  if (!validation.formattedValue) {
    return false
  }

  return content === validation.formattedValue
}
