export type BodyPreviewKind =
  | 'json'
  | 'text'
  | 'html'
  | 'xml'
  | 'css'
  | 'javascript'
  | 'form-urlencoded'
  | 'form-multipart'
  | 'sse'
  | 'media-image'
  | 'media-video'
  | 'media-font'
  | 'hex'
  | 'base64'

export type BodyPreviewContext = {
  isWebSocket?: boolean
}

export type ContentTypeFlags = {
  json: boolean
  image: boolean
  video: boolean
  font: boolean
  html: boolean
  xml: boolean
  css: boolean
  javascript: boolean
  multipart: boolean
  urlencoded: boolean
  websocket: boolean
  sse: boolean
}

export function parseContentTypeFlags(
  contentType?: string,
  context: BodyPreviewContext = {},
): ContentTypeFlags {
  const normalized = contentType?.toLowerCase() ?? ''

  return {
    json: normalized.includes('application/json') || normalized.includes('+json'),
    image: normalized.includes('image/'),
    video: normalized.includes('video/'),
    font: normalized.includes('font'),
    html: normalized.includes('text/html') || normalized.includes('application/xhtml'),
    xml: normalized.includes('xml'),
    css: normalized.includes('text/css'),
    javascript: normalized.includes('javascript') || normalized.includes('ecmascript'),
    multipart: normalized.includes('multipart/form-data'),
    urlencoded: normalized.includes('application/x-www-form-urlencoded'),
    websocket: context.isWebSocket ?? normalized.includes('websocket'),
    sse: normalized.includes('text/event-stream'),
  }
}

export function resolveBodyPreviewKind(
  contentType?: string,
  context: BodyPreviewContext = {},
): BodyPreviewKind {
  const flags = parseContentTypeFlags(contentType, context)

  if (flags.json) {
    return 'json'
  }

  if (flags.image) {
    return 'media-image'
  }

  if (flags.video) {
    return 'media-video'
  }

  if (flags.font) {
    return 'media-font'
  }

  if (flags.websocket) {
    return 'text'
  }

  if (flags.multipart) {
    return 'form-multipart'
  }

  if (flags.urlencoded) {
    return 'form-urlencoded'
  }

  if (flags.sse) {
    return 'sse'
  }

  if (flags.html) {
    return 'html'
  }

  if (flags.xml) {
    return 'xml'
  }

  if (flags.css) {
    return 'css'
  }

  if (flags.javascript) {
    return 'javascript'
  }

  return 'text'
}

const KIND_LABELS: Record<BodyPreviewKind, string> = {
  json: 'Json',
  text: 'Text',
  html: 'Html',
  xml: 'Xml',
  css: 'Css',
  javascript: 'Js',
  'form-urlencoded': 'Form',
  'form-multipart': 'Form',
  sse: 'SSE',
  'media-image': 'Image',
  'media-video': 'Video',
  'media-font': 'Font',
  hex: 'Hex',
  base64: 'Base64',
}

export function bodyPreviewKindLabel(kind: BodyPreviewKind): string {
  return KIND_LABELS[kind]
}

export function listAvailablePreviewKinds(
  byteLength: number,
  contentType?: string,
  context: BodyPreviewContext = {},
): BodyPreviewKind[] {
  if (byteLength <= 0) {
    return []
  }

  const flags = parseContentTypeFlags(contentType, context)
  const kinds: BodyPreviewKind[] = []

  if (flags.json) {
    kinds.push('json')
  }

  if (flags.image) {
    kinds.push('media-image')
  }

  if (flags.video) {
    kinds.push('media-video')
  }

  if (flags.font) {
    kinds.push('media-font')
  }

  if (flags.html) {
    kinds.push('html')
  }
  else if (flags.xml) {
    kinds.push('xml')
  }
  else if (flags.css) {
    kinds.push('css')
  }
  else if (flags.javascript) {
    kinds.push('javascript')
  }
  else if (
    !flags.multipart
    && !flags.urlencoded
    && !flags.sse
    && !flags.image
    && !flags.video
    && !flags.font
  ) {
    kinds.push('text')
  }

  if (flags.multipart || flags.urlencoded) {
    kinds.push(flags.multipart ? 'form-multipart' : 'form-urlencoded')
  }

  if (flags.sse) {
    kinds.push('sse')
  }

  kinds.push('hex', 'base64')

  return [...new Set(kinds)]
}
