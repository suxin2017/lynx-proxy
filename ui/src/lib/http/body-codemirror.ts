import type { WorkbenchLanguage } from '@/components/ui/content-workbench/utils'
import type { BodyPreviewKind } from './body-preview-kind'

/** Hex/SSE keep one protocol line per editor row; other kinds soft-wrap visually. */
export function bodyKindUsesSoftWrap(kind: BodyPreviewKind): boolean {
  return kind !== 'hex' && kind !== 'sse'
}

export function bodyKindToCodeMirrorLanguage(
  kind: BodyPreviewKind,
  contentType?: string,
): WorkbenchLanguage {
  switch (kind) {
    case 'json':
      return 'json'
    case 'html':
      return 'html'
    case 'xml':
      return 'xml'
    case 'css':
      return 'css'
    case 'javascript':
      return 'javascript'
    case 'hex':
      return 'hex'
    case 'base64':
      return 'base64'
    case 'sse':
      return 'sse'
    case 'text':
      return inferTextLanguage(contentType)
    default:
      return 'plaintext'
  }
}

function inferTextLanguage(contentType?: string): WorkbenchLanguage {
  const normalized = contentType?.toLowerCase() ?? ''

  if (normalized.includes('application/json') || normalized.includes('+json')) {
    return 'json'
  }

  if (normalized.includes('text/html') || normalized.includes('application/xhtml')) {
    return 'html'
  }

  if (normalized.includes('xml')) {
    return 'xml'
  }

  if (normalized.includes('text/css')) {
    return 'css'
  }

  if (normalized.includes('javascript') || normalized.includes('ecmascript')) {
    return 'javascript'
  }

  if (normalized.includes('text/event-stream')) {
    return 'sse'
  }

  return 'plaintext'
}
