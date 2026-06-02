export type WorkbenchType =
  | 'text'
  | 'json'
  | 'html-source'
  | 'xml-source'
  | 'css-source'
  | 'javascript-source'
  | 'code'
export type WorkbenchSurface = 'preview' | 'readonly-code'
export type WorkbenchLanguage =
  | 'plaintext'
  | 'json'
  | 'html'
  | 'xml'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'hex'
  | 'base64'
  | 'sse'

export interface ResolveWorkbenchSurfaceInput {
  type: WorkbenchType
  content: unknown
  degradeThreshold?: number
}

export interface NormalizeWorkbenchContentInput {
  type: WorkbenchType
  content: unknown
}

export interface ResolveWorkbenchLanguageInput {
  type: WorkbenchType
  language?: string
}

export interface NormalizedWorkbenchContent {
  displayValue: string
  hasFormattingError: boolean
}

const DEFAULT_DEGRADE_THRESHOLD = 10_000

function toDisplayString(content: unknown) {
  if (typeof content === 'string') {
    return content
  }

  if (content == null) {
    return ''
  }

  return String(content)
}

export function resolveWorkbenchSurface(
  input: ResolveWorkbenchSurfaceInput,
): WorkbenchSurface {
  const content = toDisplayString(input.content)
  const threshold = input.degradeThreshold ?? DEFAULT_DEGRADE_THRESHOLD

  if (content.length > threshold) {
    return 'preview'
  }

  return input.type === 'text' ? 'preview' : 'readonly-code'
}

export function normalizeWorkbenchContent(
  input: NormalizeWorkbenchContentInput,
): NormalizedWorkbenchContent {
  if (input.type !== 'json') {
    return {
      displayValue: toDisplayString(input.content),
      hasFormattingError: false,
    }
  }

  try {
    const source = typeof input.content === 'string'
      ? JSON.parse(input.content)
      : input.content

    return {
      displayValue: JSON.stringify(source, null, 2),
      hasFormattingError: false,
    }
  }
  catch {
    return {
      displayValue: toDisplayString(input.content),
      hasFormattingError: true,
    }
  }
}

export function resolveWorkbenchLanguage(
  input: ResolveWorkbenchLanguageInput,
): WorkbenchLanguage {
  if (input.type === 'json') {
    return 'json'
  }

  if (input.type === 'html-source') {
    return 'html'
  }

  if (input.type === 'xml-source') {
    return 'xml'
  }

  if (input.type === 'css-source') {
    return 'css'
  }

  if (input.type === 'javascript-source') {
    return 'javascript'
  }

  switch (input.language?.toLowerCase()) {
    case 'js':
    case 'mjs':
    case 'cjs':
    case 'javascript':
      return 'javascript'
    case 'ts':
    case 'tsx':
    case 'typescript':
      return 'typescript'
    case 'json':
      return 'json'
    case 'html':
    case 'htm':
    case 'xhtml':
      return 'html'
    case 'xml':
    case 'svg':
      return 'xml'
    case 'css':
      return 'css'
    default:
      return 'plaintext'
  }
}